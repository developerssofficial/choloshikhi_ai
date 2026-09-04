import * as cheerio from "cheerio";
import https from "https";
import fs from "fs";
import path from "path";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const CLASS_PAGES = [
  { classNum: 1, name: "প্রথম শ্রেণি", pageId: "695b9adec4774958d7b708cd", url: "https://nctb.gov.bd/pages/static-pages/695b9adec4774958d7b708cd" },
  { classNum: 2, name: "দ্বিতীয় শ্রেণি", pageId: "695b9935c4774958d7b70508", url: "https://nctb.gov.bd/pages/static-pages/695b9935c4774958d7b70508" },
  { classNum: 3, name: "তৃতীয় শ্রেণি", pageId: "695b9980c4774958d7b70591", url: "https://nctb.gov.bd/pages/static-pages/695b9980c4774958d7b70591" },
  { classNum: 4, name: "চতুর্থ শ্রেণি", pageId: "695b99ccc4774958d7b70680", url: "https://nctb.gov.bd/pages/static-pages/695b99ccc4774958d7b70680" },
  { classNum: 5, name: "পঞ্চম শ্রেণি", pageId: "695b9a68c4774958d7b707a5", url: "https://nctb.gov.bd/pages/static-pages/695b9a68c4774958d7b707a5" },
];

async function inspectPages() {
  console.log("=== NCTB CLASS PAGES INSPECTION ===");
  const debugDir = path.resolve("debug_nctb");
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

  for (const item of CLASS_PAGES) {
    console.log(`\n-------------------------------------------`);
    console.log(`Fetching Class ${item.classNum}: ${item.url}`);
    try {
      const res = await fetch(item.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "bn,en;q=0.9",
        },
      });
      console.log(`HTTP Status: ${res.status}`);
      const html = await res.text();
      fs.writeFileSync(path.join(debugDir, `class_${item.classNum}.html`), html);

      const $ = cheerio.load(html);

      // Search for API calls or JSON data embedded in page
      const contentViewer = $("div.content-details, div.content-viewer, div.article-body, div.body, div.unique-category-container");
      console.log("Main content divs found:", contentViewer.length);

      // Look for any table or content
      let foundTables = [];
      $("table").each((i, table) => {
        const rows = [];
        $(table).find("tr").each((r, tr) => {
          const cells = $(tr).find("th, td").map((c, td) => $(td).text().trim()).get();
          rows.push(cells);
        });
        foundTables.push(rows);
      });
      console.log(`Tables parsed: ${foundTables.length}`);
      if (foundTables.length > 0) {
        console.log("First Table Header/Rows:", JSON.stringify(foundTables[0].slice(0, 4), null, 2));
      }

      // Check for backend REST API endpoints from the portal
      const apiMatches = html.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
      console.log("Discovered API endpoints:", Array.from(new Set(apiMatches)));

    } catch (err) {
      console.error(`Error fetching class ${item.classNum}:`, err.message);
    }
  }

  // Also test fetching the static page API endpoint if portal uses it
  for (const item of CLASS_PAGES) {
    const apiUrls = [
      `https://nctb.gov.bd/api/v1/static-pages/${item.pageId}`,
      `https://nctb.gov.bd/api/static-pages/${item.pageId}`,
      `https://nctb.gov.bd/api/pages/${item.pageId}`,
      `https://nctb.portal.gov.bd/api/v1/static-pages/${item.pageId}`
    ];
    for (const apiUrl of apiUrls) {
      try {
        const res = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
        if (res.ok) {
          const json = await res.json();
          console.log(`\nSUCCESS API endpoint for Class ${item.classNum}: ${apiUrl}`);
          fs.writeFileSync(path.join(debugDir, `api_class_${item.classNum}.json`), JSON.stringify(json, null, 2));
          break;
        }
      } catch (e) {}
    }
  }
}

inspectPages();
