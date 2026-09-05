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
 * Converts Bengali numeral string to standard English digit string
 */
export function convertBengaliToEnglishNumerals(text: string): string {
  if (!text) return "";
  const bnToEn: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  return text.replace(/[০-৯]/g, (w) => bnToEn[w] || w);
}

/**
 * Normalizes text for robust intent matching (Bengali + Banglish)
 */
function normalizeQuery(text: string): string {
  const converted = convertBengaliToEnglishNumerals(text || "");
  return converted.toLowerCase().replace(/[?,!.:;()_]/g, " ").trim();
}

/**
 * Detects target class (1 to 5) from message or recent history
 */
export function detectClassNumber(text: string): number | null {
  const norm = normalizeQuery(text);

  if (
    /\b(class\s*1|1st\s*class|grade\s*1|one|prothom|১ম|প্রথম)\b/i.test(norm) ||
    norm.includes("class 1") ||
    norm.includes("১ম শ্রেণি") ||
    norm.includes("প্রথম শ্রেণি") ||
    norm.includes("class-1") ||
    norm.includes("1st class")
  ) {
    return 1;
  }
  if (
    /\b(class\s*2|2nd\s*class|grade\s*2|two|ditiyo|২য়|দ্বিতীয়|দ্বিতীয়)\b/i.test(norm) ||
    norm.includes("class 2") ||
    norm.includes("২য় শ্রেণি") ||
    norm.includes("দ্বিতীয় শ্রেণি") ||
    norm.includes("দ্বিতীয় শ্রেণি") ||
    norm.includes("class-2") ||
    norm.includes("2nd class")
  ) {
    return 2;
  }
  if (
    /\b(class\s*3|3rd\s*class|grade\s*3|three|tritiyo|৩য়|তৃতীয়|তৃতীয়)\b/i.test(norm) ||
    norm.includes("class 3") ||
    norm.includes("৩য় শ্রেণি") ||
    norm.includes("তৃতীয় শ্রেণি") ||
    norm.includes("তৃতীয় শ্রেণি") ||
    norm.includes("class-3") ||
    norm.includes("3rd class")
  ) {
    return 3;
  }
  if (
    /\b(class\s*4|4th\s*class|grade\s*4|four|choturtho|৪র্থ|চতুর্থ)\b/i.test(norm) ||
    norm.includes("class 4") ||
    norm.includes("৪র্থ শ্রেণি") ||
    norm.includes("চতুর্থ শ্রেণি") ||
    norm.includes("class-4") ||
    norm.includes("4th class")
  ) {
    return 4;
  }
  if (
    /\b(class\s*5|5th\s*class|grade\s*5|five|ponchom|৫ম|পঞ্চম)\b/i.test(norm) ||
    norm.includes("class 5") ||
    norm.includes("৫ম শ্রেণি") ||
    norm.includes("পঞ্চম শ্রেণি") ||
    norm.includes("class-5") ||
    norm.includes("5th class")
  ) {
    return 5;
  }

  return null;
}

/**
 * Detects target subject from message or recent history
 */
export function detectSubject(text: string): string | null {
  const norm = normalizeQuery(text);

  if (
    norm.includes("bangla") ||
    norm.includes("বাংলা") ||
    norm.includes("amar bangla") ||
    norm.includes("আমার বাংলা") ||
    norm.includes("sahitya") ||
    norm.includes("সাহিত্য")
  ) {
    return "বাংলা";
  }
  if (
    norm.includes("english") ||
    norm.includes("ইংরেজি") ||
    norm.includes("ইংরেজি") ||
    norm.includes("eft") ||
    norm.includes("english for today")
  ) {
    return "ইংরেজি";
  }
  if (
    norm.includes("math") ||
    norm.includes("গণিত") ||
    norm.includes("gonit") ||
    norm.includes("অংক") ||
    norm.includes("onko") ||
    norm.includes("arithmetic")
  ) {
    return "গণিত";
  }
  if (
    norm.includes("science") ||
    norm.includes("বিজ্ঞান") ||
    norm.includes("biggan") ||
    norm.includes("bigyan") ||
    norm.includes("prathomik biggan") ||
    norm.includes("প্রাথমিক বিজ্ঞান")
  ) {
    return "প্রাথমিক বিজ্ঞান";
  }
  if (
    norm.includes("bgs") ||
    norm.includes("বিশ্বপরিচয়") ||
    norm.includes("বিশ্বপরিচয়") ||
    norm.includes("বাংলাদেশ ও বিশ্ব") ||
    norm.includes("social") ||
    norm.includes("shomaj") ||
    norm.includes("সমাজ")
  ) {
    return "বাংলাদেশ ও বিশ্বপরিচয়";
  }
  if (
    norm.includes("islam") ||
    norm.includes("ইসলাম") ||
    norm.includes("দ্বীন") ||
    norm.includes("dharma") ||
    norm.includes("ধর্ম")
  ) {
    if (norm.includes("hindu") || norm.includes("হিন্দু") || norm.includes("সনাতন")) {
      return "হিন্দুধর্ম শিক্ষা";
    }
    if (norm.includes("buddha") || norm.includes("buddhist") || norm.includes("বৌদ্ধ")) {
      return "বৌদ্ধধর্ম শিক্ষা";
    }
    if (norm.includes("christian") || norm.includes("খ্রিষ্ট") || norm.includes("খ্রিস্ট")) {
      return "খ্রিষ্টধর্ম শিক্ষা";
    }
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
 * Extracts target page number from message
 * Examples: "১৫ নম্বর পৃষ্ঠা", "পৃষ্ঠা ১৫", "page 15", "15 no page", "15 prishtay", "৩ নম্বর পাতায়"
 */
export function detectPageNumber(text: string): number | null {
  const norm = normalizeQuery(text);

  // Match patterns like: "page 15", "page no 15", "p. 15", "p 15"
  const pMatch1 = norm.match(/\b(?:page|pg|p)\s*(?:no\.?|number|num)?\s*(\d{1,3})\b/i);
  if (pMatch1 && pMatch1[1]) {
    const num = parseInt(pMatch1[1], 10);
    if (num > 0 && num <= 300) return num;
  }

  // Match patterns like: "15 page", "15 no page", "15th page"
  const pMatch2 = norm.match(/\b(\d{1,3})\s*(?:st|nd|rd|th)?\s*(?:no|number)?\s*(?:page|pg)\b/i);
  if (pMatch2 && pMatch2[1]) {
    const num = parseInt(pMatch2[1], 10);
    if (num > 0 && num <= 300) return num;
  }

  // Match Bengali patterns: "পৃষ্ঠা ১৫", "পৃষ্ঠার ১৫", "পাতা ১৫"
  const pMatch3 = norm.match(/(?:পৃষ্ঠা|পৃষ্ঠার|পাতা|পাতার|prishta|prishtay|prishtha|patay)\s*(?:নং|নম্বর|no)?\s*(\d{1,3})/i);
  if (pMatch3 && pMatch3[1]) {
    const num = parseInt(pMatch3[1], 10);
    if (num > 0 && num <= 300) return num;
  }

  // Match Bengali patterns: "১৫ নম্বর পৃষ্ঠা", "১৫ নং পৃষ্ঠা", "১৫ পৃষ্ঠায়", "১৫ পাতায়"
  const pMatch4 = norm.match(/(\d{1,3})\s*(?:নং|নম্বর|তম)?\s*(?:পৃষ্ঠা|পৃষ্ঠার|পৃষ্ঠায়|পাতা|পাতায়|prishta|prishtay|prishtha|patay)/i);
  if (pMatch4 && pMatch4[1]) {
    const num = parseInt(pMatch4[1], 10);
    if (num > 0 && num <= 300) return num;
  }

  return null;
}

/**
 * Detects if the user is asking how to teach or explain (Pedagogy intent)
 */
export function detectPedagogyIntent(text: string): boolean {
  const norm = normalizeQuery(text);
  return (
    /কীভাবে\s*(?:বুঝাবো|পড়াবো|শেখাবো|বোঝানো|শেখানো|পড়ানো)|how\s*to\s*teach|kivabe\s*(?:bujhabo|porabo|shekhabo|bujhate|porate|shikhate)|bujhanor\s*upay|poranor\s*upay|lesson\s*plan|পাঠদান|শিক্ষাদান|কৌশল|pedagogy|প্ল্যান|plan|ফ্লো\s*চার্ট|flow\s*chart|flowchart|চার্ট|ধাপে\s*ধাপে|পদ্ধতি|পড়ান|পড়িয়ে|বুঝিয়ে/i.test(
      norm
    )
  );
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

  // 1. Detect Target Class, Subject, Page Number, and Pedagogy Intent
  const targetClass = detectClassNumber(query) || detectClassNumber(historyText);
  const targetSubject = detectSubject(query) || detectSubject(historyText);
  const targetPage = detectPageNumber(query);
  const isPedagogy = detectPedagogyIntent(query) || detectPedagogyIntent(historyText);

  // Intent Flags
  const isAskingChapterCountOrList =
    /koyta|koita|koto|koyti|how\s*many|chapter|chaptr|path|lesson|পাঠ|অধ্যায়|অধ্যায়|সূচিপত্র|suchipotro|toc|list|তালিকা|শিরোনাম|কি\s*কি|kiki|ki\s*ki/i.test(
      normQuery
    );

  const isAskingPageCountOrSource =
    /koto\s*page|source|sorce|link|pdf|উৎস|লিংক|ডাউনলোড|download/i.test(
      normQuery
    );

  const isAskingGeneralBooks =
    /সব\s*বই|কয়টি\s*বই|বইয়ের\s*তালিকা|all\s*books|textbook\s*list|pdf\s*link/i.test(
      normQuery
    );

  // If asking about all books in primary or specific class
  if (isAskingGeneralBooks && !targetSubject && !targetPage) {
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
  if (targetClass || targetSubject || targetPage) {
    const classNum = targetClass || 1;
    const classBooks = getBooksByClass(classNum);

    // Find matched book
    let matchedBook: BookRecord | undefined;
    if (targetSubject) {
      matchedBook = classBooks.find(
        (b) =>
          b.subject.includes(targetSubject) ||
          b.book_name.includes(targetSubject) ||
          targetSubject.includes(b.subject)
      );
    }

    // Default to Bangla if only class was specified
    if (!matchedBook && classBooks.length > 0) {
      matchedBook = classBooks[0]; // First book (usually Bangla)
    }

    if (matchedBook) {
      const chapters = getChaptersByBookId(matchedBook.id);
      const totalLessons = matchedBook.total_chapters || matchedBook.table_of_contents?.length || chapters.length;
      const totalPages = matchedBook.pdf?.total_pages || 100;

      let ctx = `\n\n═══ [NCTB ২০২৬ অফিসিয়াল পাঠ্যবই ডেটাবেজ: ${matchedBook.class_name} — ${matchedBook.book_name}] ═══\n`;
      ctx += `[CRITICAL GROUNDING RULES:
1. বইয়ের নাম: ${matchedBook.book_name} (${matchedBook.class_name})
2. মোট পাঠ/অধ্যায় সংখ্যা: ঠিক হুবহু ${totalLessons}টি (২০২৬ অফিশিয়াল কারিকুলাম অনুযায়ী)।
3. মোট পৃষ্ঠা সংখ্যা: ${totalPages} পৃষ্ঠা।
4. ডাউনলোড লিংক / অফিশিয়াল সোর্স:
   - Link 1: ${matchedBook.download_links?.link_1 || matchedBook.official_page_url}
   - Link 2: ${matchedBook.download_links?.link_2 || matchedBook.official_page_url}
5. নিচে সম্পূর্ণ অফিশিয়াল সূচিপত্র ও বিস্তারিত বিষয়বস্তু দেওয়া হলো। নির্ভুল তথ্য এখান থেকেই দিতে হবে।]
`;

      // ─── SPECIFIC PAGE QUERY (পৃষ্ঠা অনুযায়ী হুবহু তথ্য ও পাঠদান) ───
      if (targetPage !== null) {
        const pageChapters = chapters.filter(
          (c) => c.start_page <= targetPage && targetPage <= c.end_page
        );

        ctx += `\n🎯 **[পৃষ্ঠা ${targetPage} এর অফিশিয়াল বিস্তারিত তথ্য ও পাঠ পরিচিতি]:**\n`;
        if (pageChapters.length > 0) {
          for (const ch of pageChapters) {
            const allQuestions = getQuestionsByChapterId(ch.chapter_id);
            const pageQuestions = allQuestions.filter((q) => q.page_number === targetPage);
            const pageSections = ch.sections?.filter((s) => s.page === targetPage) || [];
            const pageIllustrations = ((ch as any).illustrations || []).filter(
              (ill: any) => ill.page === targetPage
            );

            ctx += `\n📖 **পাঠ/অধ্যায়:** পাঠ ${ch.chapter_number} — ${ch.chapter_title} (মোট পরিসর: পৃষ্ঠা ${ch.start_page} থেকে ${ch.end_page})\n`;
            ctx += `- পাঠের ধরণ: ${ch.chapter_type}${ch.author ? ` | লেখক/উৎস: ${ch.author}` : ""}\n`;
            ctx += `- সারসংক্ষেপ: ${ch.summary}\n`;

            if (pageSections.length > 0) {
              ctx += `- 📑 পৃষ্ঠা ${targetPage}-এর বিষয়বস্তু ও সেকশন:\n`;
              pageSections.forEach((s) => {
                ctx += `  • ${s.title}\n`;
              });
            }

            if (pageIllustrations.length > 0) {
              ctx += `- 🖼️ পৃষ্ঠা ${targetPage}-এর অফিশিয়াল রঙিন চিত্রসমূহ:\n`;
              pageIllustrations.forEach((ill: any) => {
                ctx += `  • ${ill.description || ill.title}\n`;
              });
            } else if ((ch as any).illustrations?.length) {
              ctx += `- 🖼️ পাঠের রঙিন চিত্রসমূহ:\n`;
              (ch as any).illustrations.forEach((ill: any) => {
                ctx += `  • [পৃষ্ঠা ${ill.page}] ${ill.description || ill.title}\n`;
              });
            }

            if (pageQuestions.length > 0) {
              ctx += `- 📝 পৃষ্ঠা ${targetPage}-এর অনুশীলনী ও কাজ (প্রশ্নাবলী):\n`;
              pageQuestions.forEach((q, qIdx) => {
                ctx += `  ${qIdx + 1}. [${q.question_type}] ${q.question_number ? `${q.question_number} ` : ""}${q.original_text || q.instruction}${q.options?.length ? ` (বিকল্প: ${q.options.join(" | ")})` : ""}\n`;
              });
            } else if (allQuestions.length > 0) {
              ctx += `- 📝 পাঠের সামগ্রিক প্রশ্নাবলী:\n`;
              allQuestions.slice(0, 3).forEach((q, qIdx) => {
                ctx += `  ${qIdx + 1}. [${q.question_type}] ${q.original_text || q.instruction} (পৃষ্ঠা ${q.page_number})\n`;
              });
            }

            // Pedagogy guidance for this page
            ctx += `\n👩‍🏫 **এই পৃষ্ঠাটি শিক্ষার্থীদের বুঝানোর/পড়ানোর সঠিক পদ্ধতি (${matchedBook.class_name} উপযোগী):**\n`;
            if (matchedBook.class_number <= 2) {
              ctx += `1. **ছবি দেখানো ও গল্প বলা:** প্রথমে বইয়ের রঙিন ছবিগুলো দেখিয়ে জিজ্ঞেস করুন ছবিতে কী দেখা যাচ্ছে।\n`;
              ctx += `2. **উচ্চারণ ও ছড়া/শব্দ:** শিক্ষক/অভিভাবক সুর করে পড়বেন, শিক্ষার্থী সাথে সাথে পড়বে।\n`;
              ctx += `3. **বাস্তব উপকরণ দিয়ে চেনানো:** বর্ণ বা সংখ্যার জন্য হাতের আঙুল, ফুল, পাতা বা বাস্তব কাঠি ব্যবহার করে শেখান।\n`;
              ctx += `4. **ছোট্ট খেলা ও প্রশ্ন:** "বলো তো দেখি এখানে কোন পাখি?" বা "এই ছবিটির নাম কী?" দিয়ে যাচাই করুন।\n`;
            } else {
              ctx += `1. **পূর্বজ্ঞান যাচাই ও কৌতূহল তৈরি:** দৈনন্দিন জীবনের সাথে মিল রেখে ১টি সহজ প্রশ্ন করুন।\n`;
              ctx += `2. **ধারণা ব্যাখ্যা ও পাঠ উপস্থাপন:** পৃষ্ঠার মূল বিষয়টি ধাপে ধাপে স্পষ্ট বাংলায় উদাহরণসহ বুঝিয়ে দিন।\n`;
              ctx += `3. **যৌথ অনুশীলন:** পৃষ্ঠার ছবি/ছক বা অংকটি শিক্ষার্থীদের সাথে নিয়ে সমাধান করুন।\n`;
              ctx += `4. **একক কাজ ও মূল্যায়ন:** পৃষ্ঠার প্রশ্নগুলো দিয়ে তাদের নিজস্ব মতামত যাচাই করুন।\n`;
            }
          }
        } else {
          ctx += `পৃষ্ঠা ${targetPage} বইয়ের মূল পাঠ/অনুশীলনী অংশের অন্তর্ভুক্ত (মোট পৃষ্ঠা: ${totalPages})।\n`;
        }
        return ctx;
      }

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
            ctx += `- 📑 সেকশনসমূহ:\n`;
            ch.sections.forEach((s) => {
              ctx += `  • [পৃষ্ঠা ${s.page}] ${s.title}\n`;
            });
          }
          if ((ch as any).illustrations?.length) {
            ctx += `- 🖼️ পাঠ্যবইয়ের অফিশিয়াল চিত্রসমূহ:\n`;
            (ch as any).illustrations.forEach((ill: any) => {
              ctx += `  • [পৃষ্ঠা ${ill.page}] ${ill.description || ill.title}\n`;
            });
          }
          if (questions.length > 0) {
            ctx += `- 📋 অফিশিয়াল অনুশীলনী ও প্রশ্নাবলী (মোট ${questions.length}টি প্রশ্ন):\n`;
            questions.forEach((qItem, qIdx) => {
              ctx += `  ${qIdx + 1}. [${qItem.question_type}] ${qItem.question_number ? `${qItem.question_number} ` : ""}${qItem.original_text || qItem.instruction} (পৃষ্ঠা: ${qItem.page_number})${qItem.options && qItem.options.length > 0 ? ` [বিকল্প: ${qItem.options.join(" | ")}]` : ""}\n`;
            });
          }

          if (isPedagogy) {
            ctx += `\n🗺️ **ভিজ্যুয়াল শিখন ফ্লো-চার্ট (Visual Learning Flowchart):**\n`;
            ctx += `\`\`\`flowchart\n`;
            ctx += `[১. ছবি ও বাস্তব ধারণা 🖼️ | বইয়ের রঙিন চিত্র দেখে পাঠের ভাব বোঝা]\n`;
            ctx += `[২. মূল বিষয়বস্তু ও ছড়া/গল্প 📖 | স্পষ্ট উচ্চারণে সুর করে আবৃত্তি ও গল্প শোনা]\n`;
            ctx += `[৩. বর্ণ ও শব্দ গঠন 🗣️ | ছবি ও ধ্বনি মিলিয়ে নতুন শব্দ মুখে বলা]\n`;
            ctx += `[৪. হাতের লেখা ও অনুশীলন ✍️ | খাতায় বর্ণ লেখা ও দাগ মিলিয়ে অনুশীলন]\n`;
            ctx += `[৫. শিখন মূল্যায়ন ও কুইজ 🏆 | ছোট ছোট প্রশ্নের উত্তর দিয়ে প্রশংসা অর্জন]\n`;
            ctx += `\`\`\`\n\n`;
            ctx += `👩‍🏫 **ধাপে ধাপে পাঠদান পরিকল্পনা (${matchedBook.class_name} উপযোগী):**\n`;
            ctx += `1. **আকর্ষণ ও ছবি পর্যবেক্ষণ:** বইয়ের রঙিন চিত্র দেখিয়ে শিক্ষার্থীদের কৌতূহল তৈরি করুন ও মূল ভাব নিয়ে কথা বলুন।\n`;
            ctx += `2. **উপস্থাপন ও আবৃত্তি:** গল্প বা ছড়াটি স্পষ্ট উচ্চারণে সুর করে পাঠ করুন এবং শিক্ষার্থীদের সাথে পুনরাবৃত্তি করান।\n`;
            ctx += `3. **অনুশীলন ও প্রয়োগ:** বর্ণ, কারচিহ্ন, যুক্তবর্ণ ও শব্দ গঠনের মাধ্যমে খাতায় লিখিয়ে অনুশীলন করান।\n`;
            ctx += `4. **ছোট্ট কুইজ ও শিখন যাচাই:** শিক্ষার্থীদের পাঠভিত্তিক ছোট ছোট প্রশ্ন করে উত্তর নিশ্চিত করুন ও প্রশংসা করুন।\n`;
          }
        }
      } else {
        ctx += `\n📋 **অফিশিয়াল সম্পূর্ণ সূচিপত্র (মোট ${totalLessons}টি পাঠ):**\n`;
        ctx += matchedBook.table_of_contents?.map((t) => `- ${t}`).join("\n") || chapters.map((c) => `- পাঠ ${c.chapter_number}: ${c.chapter_title} (পৃষ্ঠা ${c.start_page}-${c.end_page})`).join("\n");
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
