import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const CLASS_CONFIG = [
  { classNum: 1, name: "প্রথম শ্রেণি", url: "https://nctb.gov.bd/pages/static-pages/695b9adec4774958d7b708cd", htmlPath: "debug_nctb/class_1.html" },
  { classNum: 2, name: "দ্বিতীয় শ্রেণি", url: "https://nctb.gov.bd/pages/static-pages/695b9935c4774958d7b70508", htmlPath: "debug_nctb/class_2.html" },
  { classNum: 3, name: "তৃতীয় শ্রেণি", url: "https://nctb.gov.bd/pages/static-pages/695b9980c4774958d7b70591", htmlPath: "debug_nctb/class_3.html" },
  { classNum: 4, name: "চতুর্থ শ্রেণি", url: "https://nctb.gov.bd/pages/static-pages/695b99ccc4774958d7b70680", htmlPath: "debug_nctb/class_4.html" },
  { classNum: 5, name: "পঞ্চম শ্রেণি", url: "https://nctb.gov.bd/pages/static-pages/695b9a68c4774958d7b707a5", htmlPath: "debug_nctb/class_5.html" },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSubjectCode(name) {
  if (name.includes("বাংলা")) return "bangla";
  if (name.includes("English")) return "english";
  if (name.includes("গণিত")) return "math";
  if (name.includes("বিজ্ঞান")) return "science";
  if (name.includes("বিশ্বপরিচয়") || name.includes("বিজিএস")) return "bgs";
  if (name.includes("ইসলাম")) return "islam";
  if (name.includes("হিন্দু")) return "hindu";
  if (name.includes("বৌদ্ধ")) return "buddha";
  if (name.includes("খ্রিষ্ট")) return "christian";
  return "general";
}

function buildManifest() {
  const books = [];
  const primaryDataDir = path.resolve("data/2026/primary");
  if (!fs.existsSync(primaryDataDir)) fs.mkdirSync(primaryDataDir, { recursive: true });

  for (const cfg of CLASS_CONFIG) {
    const classDir = path.join(primaryDataDir, `class-${cfg.classNum}`);
    if (!fs.existsSync(classDir)) fs.mkdirSync(classDir, { recursive: true });

    const html = fs.readFileSync(path.resolve(cfg.htmlPath), "utf-8");
    const $ = cheerio.load(html);

    $("table tr").each((rIdx, tr) => {
      const tds = $(tr).find("th, td");
      if (tds.length === 0 || rIdx === 0) return;

      const sl = $(tds[0]).text().trim().replace(/[।|.]/g, "");
      const bnName = $(tds[1]).text().trim().replace(/\s+/g, " ");
      if (!bnName) return;

      const bnLink1 = $(tds[2]).find("a").eq(0).attr("href") || "";
      const bnLink2 = $(tds[2]).find("a").eq(1).attr("href") || "";

      let enName = "";
      let enLink1 = "";
      let enLink2 = "";
      if (tds.length >= 5) {
        enName = $(tds[3]).text().trim().replace(/\s+/g, " ");
        enLink1 = $(tds[4]).find("a").eq(0).attr("href") || "";
        enLink2 = $(tds[4]).find("a").eq(1).attr("href") || "";
      }

      const subjectCode = getSubjectCode(bnName);
      const bookSlug = `class-${cfg.classNum}-${subjectCode}`;
      const bookId = `2026-primary-class-${cfg.classNum}-${subjectCode}`;

      const bookEntry = {
        id: bookId,
        slug: bookSlug,
        academic_year: 2026,
        level: "primary",
        class_number: cfg.classNum,
        class_name: cfg.name,
        official_book_name: bnName,
        normalized_book_name: bnName,
        subject: bnName.includes("ধর্ম") || bnName.includes("ইসলাম") ? "ধর্ম ও নৈতিক শিক্ষা" : bnName,
        subject_code: subjectCode,
        language: "bn",
        version: "bangla",
        official_class_page_url: cfg.url,
        download_links: {
          link_1: bnLink1,
          link_2: bnLink2,
          resolved_pdf_url: bnLink1 || bnLink2,
        },
        english_version: enName ? {
          official_book_name: enName,
          download_links: {
            link_1: enLink1,
            link_2: enLink2,
            resolved_pdf_url: enLink1 || enLink2,
          }
        } : null,
        pdf: {
          local_path: `data/2026/primary/class-${cfg.classNum}/${bookSlug}/source/original.pdf`,
          file_name: `${bookSlug}.pdf`,
          file_size: 0,
          total_pages: 0,
          sha256: ""
        },
        publication: {
          publisher: "জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড, বাংলাদেশ (NCTB)",
          authors: [],
          editors: [],
          illustrators: [],
          isbn: null
        },
        table_of_contents: [],
        chapters: [],
        validation: {
          download_verified: false,
          page_count_verified: false,
          toc_verified: false,
          questions_verified: false,
          needs_review: false
        }
      };

      books.push(bookEntry);

      // Create individual book directory layout
      const bookFolder = path.join(classDir, bookSlug);
      const sourceFolder = path.join(bookFolder, "source");
      const pagesFolder = path.join(bookFolder, "pages");
      const imagesFolder = path.join(bookFolder, "images");

      fs.mkdirSync(sourceFolder, { recursive: true });
      fs.mkdirSync(pagesFolder, { recursive: true });
      fs.mkdirSync(imagesFolder, { recursive: true });
    });
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    academic_year: 2026,
    education_level: "primary",
    total_books: books.length,
    books_by_class: {
      "class-1": books.filter(b => b.class_number === 1).length,
      "class-2": books.filter(b => b.class_number === 2).length,
      "class-3": books.filter(b => b.class_number === 3).length,
      "class-4": books.filter(b => b.class_number === 4).length,
      "class-5": books.filter(b => b.class_number === 5).length,
    },
    books
  };

  const manifestPath = path.join(primaryDataDir, "books-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`Manifest created successfully at: ${manifestPath}`);
  console.log(`Total books registered: ${books.length}`);
  console.log(JSON.stringify(manifest.books_by_class, null, 2));
}

buildManifest();
