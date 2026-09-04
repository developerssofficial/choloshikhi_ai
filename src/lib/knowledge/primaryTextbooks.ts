import {
  getBookById,
  getBooksByClass,
  getChaptersByBookId,
  getQuestionsByChapterId,
  searchDataset,
  BookRecord,
  ChapterRecord,
  QuestionRecord,
} from "../nctbDb";

/**
 * Normalizes text for robust intent matching (Bengali + Banglish)
 */
function normalizeQuery(text: string): string {
  return (text || "").toLowerCase().replace(/[?,!.:;()]/g, " ").trim();
}

/**
 * Detects target class (1 to 5) from message or recent history
 */
function detectClassNumber(text: string): number | null {
  const norm = normalizeQuery(text);

  if (/\b(class\s*1|1st\s*class|grade\s*1|১ম|প্রথম|one)\b/i.test(norm) || norm.includes("class 1") || norm.includes("১ম শ্রেণি") || norm.includes("প্রথম শ্রেণি")) {
    return 1;
  }
  if (/\b(class\s*2|2nd\s*class|grade\s*2|২য়|দ্বিতীয়|দ্বিতীয়|two)\b/i.test(norm) || norm.includes("class 2") || norm.includes("২য় শ্রেণি") || norm.includes("দ্বিতীয় শ্রেণি") || norm.includes("দ্বিতীয় শ্রেণি")) {
    return 2;
  }
  if (/\b(class\s*3|3rd\s*class|grade\s*3|৩য়|তৃতীয়|তৃতীয়|three)\b/i.test(norm) || norm.includes("class 3") || norm.includes("৩য় শ্রেণি") || norm.includes("তৃতীয় শ্রেণি") || norm.includes("তৃতীয় শ্রেণি")) {
    return 3;
  }
  if (/\b(class\s*4|4th\s*class|grade\s*4|৪র্থ|চতুর্থ|four)\b/i.test(norm) || norm.includes("class 4") || norm.includes("৪র্থ শ্রেণি") || norm.includes("চতুর্থ শ্রেণি")) {
    return 4;
  }
  if (/\b(class\s*5|5th\s*class|grade\s*5|৫ম|পঞ্চম|five)\b/i.test(norm) || norm.includes("class 5") || norm.includes("৫ম শ্রেণি") || norm.includes("পঞ্চম শ্রেণি")) {
    return 5;
  }

  return null;
}

/**
 * Detects target subject from message or recent history
 */
function detectSubject(text: string): string | null {
  const norm = normalizeQuery(text);

  if (norm.includes("bangla") || norm.includes("বাংলা") || norm.includes("amar bangla") || norm.includes("আমার বাংলা")) {
    return "বাংলা";
  }
  if (norm.includes("english") || norm.includes("ইংরেজি") || norm.includes("eft") || norm.includes("english for today")) {
    return "ইংরেজি";
  }
  if (norm.includes("math") || norm.includes("গণিত") || norm.includes("gonit") || norm.includes("অংক") || norm.includes("onko")) {
    return "গণিত";
  }
  if (norm.includes("science") || norm.includes("বিজ্ঞান") || norm.includes("biggan") || norm.includes("bigyan")) {
    return "প্রাথমিক বিজ্ঞান";
  }
  if (norm.includes("bgs") || norm.includes("বিশ্বপরিচয়") || norm.includes("বিশ্বপরিচয়") || norm.includes("বাংলাদেশ ও বিশ্ব") || norm.includes("social")) {
    return "বাংলাদেশ ও বিশ্বপরিচয়";
  }
  if (norm.includes("islam") || norm.includes("ইসলাম") || norm.includes("দ্বীন")) {
    return "ইসলাম শিক্ষা";
  }
  if (norm.includes("hindu") || norm.includes("হিন্দু") || norm.includes("সনাতন")) {
    return "হিন্দুধর্ম শিক্ষা";
  }
  if (norm.includes("buddha") || norm.includes("buddhist") || norm.includes("বৌদ্ধ")) {
    return "বৌদ্ধধর্ম শিক্ষা";
  }
  if (norm.includes("christian") || norm.includes("খ্রিষ্ট") || norm.includes("খ্রিস্ট")) {
    return "খ্রিষ্টধর্ম শিক্ষা";
  }

  return null;
}

/**
 * Comprehensive Grounded Context Retriever for NCTB Primary Curriculum (Classes 1 - 5)
 */
export function findPrimaryTextbookContext(
  query: string,
  history?: Array<{ role: string; content: string }>
): string | null {
  const normQuery = normalizeQuery(query);

  // Extract context from recent 4 messages in history
  const recentHistory = (history || []).slice(-4);
  const historyText = recentHistory.map((m) => m.content).join(" ");
  const combinedText = `${query} ${historyText}`;

  // 1. Detect Class & Subject
  let targetClass = detectClassNumber(query) || detectClassNumber(historyText);
  let targetSubject = detectSubject(query) || detectSubject(historyText);

  // Intent Flags
  const isAskingChapterCountOrList =
    /koyta|koita|koto|koyti|how\s*many|chapter|chaptr|path|lesson|পাঠ|অধ্যায়|অধ্যায়|সূচিপত্র|suchipotro|toc|list|তালিকা|শিরোনাম|কি\s*কি|kiki|ki\s*ki/i.test(
      normQuery
    );

  const isAskingPageCountOrSource =
    /prisht|prishta|page|koto\s*page|source|sorce|link|pdf|উৎস|লিংক|ডাউনলোড|download/i.test(
      normQuery
    );

  const isAskingGeneralBooks =
    /সব\s*বই|কয়টি\s*বই|বইয়ের\s*তালিকা|all\s*books|textbook\s*list|pdf\s*link/i.test(
      normQuery
    );

  // If asking about all books in primary or specific class
  if (isAskingGeneralBooks && !targetSubject) {
    const classNum = targetClass || 2;
    const books = getBooksByClass(classNum);
    if (books.length > 0) {
      let ctx = `\n\n═══ [NCTB ২০২৬ প্রাথমিক পাঠ্যবই তথ্যভাণ্ডার: ${books[0].class_name}] ═══\n`;
      ctx += `[CRITICAL: জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB) ২০২৬ শিক্ষাবর্ষ অনুযায়ী ${books[0].class_name}-এ মোট ${books.length}টি অফিশিয়াল বই রয়েছে।]\n\n`;
      books.forEach((b, idx) => {
        ctx += `${idx + 1}. **${b.book_name}** (${b.total_chapters}টি পাঠ/অধ্যায়, মোট ${b.pdf?.total_pages || 100} পৃষ্ঠা)\n`;
        ctx += `   - ডাউনলোড লিংক: ${b.download_links?.link_1 || b.official_page_url}\n`;
        ctx += `   - সূচিপত্র সারাংশ: ${b.table_of_contents?.slice(0, 5).join(", ")}...\n`;
      });
      return ctx;
    }
  }

  // If specific class and/or subject is detected
  if (targetClass) {
    const classBooks = getBooksByClass(targetClass);

    // Find matched book
    let matchedBook: BookRecord | undefined;
    if (targetSubject) {
      matchedBook = classBooks.find(
        (b) =>
          b.subject.includes(targetSubject!) ||
          b.book_name.includes(targetSubject!) ||
          targetSubject!.includes(b.subject)
      );
    }

    // Default to Bangla if only class was specified and asked for chapters
    if (!matchedBook && classBooks.length > 0) {
      if (isAskingChapterCountOrList || isAskingPageCountOrSource) {
        matchedBook = classBooks[0]; // First book (usually Bangla)
      }
    }

    if (matchedBook) {
      const chapters = getChaptersByBookId(matchedBook.id);
      const totalLessons = matchedBook.total_chapters || matchedBook.table_of_contents?.length || chapters.length;
      const totalPages = matchedBook.pdf?.total_pages || 100;

      let ctx = `\n\n═══ [NCTB ২০২৬ অফিসিয়াল পাঠ্যবই ডেটাবেজ: ${matchedBook.class_name} — ${matchedBook.book_name}] ═══\n`;
      ctx += `[CRITICAL GROUNDING RULES:
1. বইয়ের নাম: ${matchedBook.book_name} (${matchedBook.class_name})
2. মোট পাঠ/অধ্যায় সংখ্যা: ঠিক হুবহু ${totalLessons}টি (কোনোভাবেই ভুল বা পুরাতন সিলেবাসের ১৮টি বলা যাবে না, ২০২৬ কারিকুলামে মোট ${totalLessons}টি পাঠ)।
3. মোট পৃষ্ঠা সংখ্যা: ${totalPages} পৃষ্ঠা।
4. ডাউনলোড লিংক / অফিসিয়াল সোর্স:
   - Link 1 (Google Drive): ${matchedBook.download_links?.link_1 || matchedBook.official_page_url}
   - Link 2 (Official Mirror): ${matchedBook.download_links?.link_2 || matchedBook.official_page_url}
5. নিচে সম্পূর্ণ অফিশিয়াল সূচিপত্র দেওয়া হলো। পাঠের নাম চাইলে এই তালিকা থেকেই দিতে হবে।]

📋 **অফিসিয়াল সম্পূর্ণ সূচিপত্র (মোট ${totalLessons}টি পাঠ):**
${matchedBook.table_of_contents?.map((t) => `- ${t}`).join("\n") || chapters.map((c) => `- পাঠ ${c.chapter_number}: ${c.chapter_title} (পৃষ্ঠা ${c.start_page}-${c.end_page})`).join("\n")}
`;

      // Check if user asked about a specific chapter
      const matchedChapters = chapters.filter(
        (c) =>
          normQuery.includes(c.chapter_title.toLowerCase()) ||
          normQuery.includes(`পাঠ ${c.chapter_number}`) ||
          normQuery.includes(`path ${c.chapter_number}`) ||
          normQuery.includes(`chapter ${c.chapter_number}`) ||
          (c.author && normQuery.includes(c.author.toLowerCase()))
      );

      if (matchedChapters.length > 0) {
        ctx += `\n📖 **নির্দিষ্ট পাঠ/অধ্যায়ের বিস্তারিত তথ্য ও প্রশ্নসমূহ:**\n`;
        for (const ch of matchedChapters) {
          const questions = getQuestionsByChapterId(ch.chapter_id);
          ctx += `\n### পাঠ ${ch.chapter_number}: ${ch.chapter_title} (পৃষ্ঠা: ${ch.start_page}-${ch.end_page})\n`;
          ctx += `- প্রকার: ${ch.chapter_type}${ch.author ? ` | লেখক/উৎস: ${ch.author}` : ""}\n`;
          ctx += `- মূল বিষয় ও সারসংক্ষেপ: ${ch.summary}\n`;
          if (ch.sections?.length) {
            ctx += `- সেকশনসমূহ: ${ch.sections.map((s) => `${s.title} (পৃষ্ঠা ${s.page})`).join(", ")}\n`;
          }
          if (questions.length > 0) {
            ctx += `- অনুশীলনী ও প্রশ্নাবলী:\n`;
            questions.forEach((qItem, qIdx) => {
              ctx += `  ${qIdx + 1}. [${qItem.question_type}] ${qItem.original_text || qItem.instruction} (পৃষ্ঠা: ${qItem.page_number})\n`;
            });
          }
        }
      }

      return ctx;
    }
  }

  // 2. Keyword Search fallback in Dataset
  const searchResults = searchDataset(query);
  if (
    searchResults.matched_books.length > 0 ||
    searchResults.matched_chapters.length > 0 ||
    searchResults.matched_questions.length > 0
  ) {
    let ctx = `\n\n═══ [NCTB ২০২৬ পাঠ্যবই সার্চ রেজাল্ট] ═══\n`;
    if (searchResults.matched_books.length > 0) {
      const b = searchResults.matched_books[0];
      ctx += `📘 **বই:** ${b.book_name} (${b.class_name}, মোট ${b.total_chapters}টি পাঠ, ${b.pdf?.total_pages || 100} পৃষ্ঠা)\n`;
      ctx += `   ডাউনলোড লিংক: ${b.download_links?.link_1 || b.official_page_url}\n`;
      ctx += `   সূচিপত্র: ${b.table_of_contents?.slice(0, 10).join(", ")}...\n`;
    }

    if (searchResults.matched_chapters.length > 0) {
      ctx += `\n📖 **সম্পর্কিত পাঠসমূহ:**\n`;
      for (const ch of searchResults.matched_chapters.slice(0, 3)) {
        ctx += `  • পাঠ ${ch.chapter_number}: ${ch.chapter_title} (পৃষ্ঠা ${ch.start_page}-${ch.end_page}) — ${ch.summary}\n`;
      }
    }

    if (searchResults.matched_questions.length > 0) {
      ctx += `\n❓ **সম্পর্কিত প্রশ্নাবলী:**\n`;
      for (const qItem of searchResults.matched_questions.slice(0, 4)) {
        ctx += `  • [${qItem.book_name}, পাঠ: ${qItem.chapter_title}] ${qItem.original_text || qItem.instruction}\n`;
      }
    }

    return ctx;
  }

  return null;
}
