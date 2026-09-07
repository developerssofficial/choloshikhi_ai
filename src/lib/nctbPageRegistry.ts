import fs from "fs";
import path from "path";
import { getBookById, getBooksByClass, getChaptersByBookId, getQuestionsByChapterId, BookRecord, ChapterRecord, QuestionRecord } from "./nctbDb";
import { NCTBPageMetadata } from "@/types/nctbPage";

/**
 * Generate grade & subject specific curriculum rules for NCTB primary syllabus
 */
function getCurriculumRules(classNum: number, subjectCode: string, chapterTitle: string): string {
  const isMath = subjectCode.includes("math") || subjectCode.includes("গণিত");
  
  if (isMath) {
    if (classNum <= 2) {
      return `Class ${classNum} Primary Math: Strictly use concrete object counting (কাঠি, মার্বেল), simple + and - horizontal/vertical addition, and simple place values (একক, দশক). Under no circumstances use algebraic symbols, formulas, or complex rules.`;
    } else if (classNum <= 4) {
      return `Class ${classNum} Primary Math: Strictly follow Class ${classNum} unitary method (ঐকিক নিয়ম), vertical arithmetic, BODMAS bracket sequence (বন্ধনী নিয়ম), and basic geometric shapes. CRITICAL: DO NOT use algebraic variables (x, y, a, b) or secondary school equations. Explain all steps in Bengali using age-appropriate arithmetic.`;
    } else {
      return `Class ${classNum} Primary Math: Follow Class 5 NCTB syllabus methods (ঐকিক নিয়ম, গড়, শতকরা, ভগ্নাংশ, অনুপাত ও কোণ/জ্যামিতি). DO NOT introduce high school algebraic formulas or unknown variable substitutions unless explicitly in textbook.`;
    }
  }

  if (subjectCode.includes("bangla") || subjectCode.includes("বাংলা")) {
    return `Class ${classNum} Bangla: Focus on correct pronunciation, word meanings (শব্দার্থ), sentence structures, moral themes, and textbook reading comprehension. Use encouraging primary school teacher language.`;
  }

  if (subjectCode.includes("science") || subjectCode.includes("বিজ্ঞান")) {
    return `Class ${classNum} Science: Explain physical and environmental concepts using daily life observations in Bangladesh. Focus on textbook definitions and simple cause-effect observations.`;
  }

  return `Class ${classNum} NCTB Primary Curriculum: Use age-appropriate Bengali language, simple concepts, and strictly adhere to NCTB Class ${classNum} textbook syllabus guidelines.`;
}

/**
 * Determine page image URL (or fallback)
 */
function getPageImageUrl(bookSlug: string, pageNumber: number): string {
  const relativePath = `public/textbooks/${bookSlug}/page_${pageNumber}.png`;
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(fullPath)) {
    return `/textbooks/${bookSlug}/page_${pageNumber}.png`;
  }
  // Return standard public path, component handles image error or placeholder
  return `/textbooks/${bookSlug}/page_${pageNumber}.png`;
}

/**
 * Parse pageId string into book lookup identifiers
 * Supported formats:
 * - "cls4_math_p38"
 * - "class-4-math_p38"
 * - "2026-primary-class-4-math_p38"
 * - "2026-primary-class-4-math:38"
 */
function parsePageId(pageId: string): { classNum?: number; subjectSlug?: string; pageNum?: number; rawBookId?: string } {
  if (!pageId) return {};

  const matchCol = pageId.match(/^(.+):(\d+)$/);
  if (matchCol) {
    return { rawBookId: matchCol[1], pageNum: parseInt(matchCol[2], 10) };
  }

  const matchUnd = pageId.match(/^(.+)_p(\d+)$/i);
  if (matchUnd) {
    const rawSubject = matchUnd[1];
    const pageNum = parseInt(matchUnd[2], 10);
    
    // Parse "cls4_math" format
    const clsMatch = rawSubject.match(/^cls(\d+)_(.+)$/i);
    if (clsMatch) {
      return { classNum: parseInt(clsMatch[1], 10), subjectSlug: clsMatch[2], pageNum };
    }

    return { rawBookId: rawSubject, pageNum };
  }

  return {};
}

/**
 * Resolve deterministic metadata for a single textbook page
 */
export async function getPageContext(pageId: string): Promise<NCTBPageMetadata | null> {
  if (!pageId) return null;

  const parsed = parsePageId(pageId);
  let book: BookRecord | null = null;
  let pageNumber = parsed.pageNum || 1;

  if (parsed.rawBookId) {
    const rawId = parsed.rawBookId;
    book = getBookById(rawId);
    if (!book) {
      // Try resolving slug like "class-4-math"
      const allClass4 = getBooksByClass(4);
      book = allClass4.find(b => b.slug === rawId || (b.id && b.id.includes(rawId))) || null;
    }
  }

  if (!book && parsed.classNum && parsed.subjectSlug) {
    const booksInClass = getBooksByClass(parsed.classNum);
    const sub = parsed.subjectSlug.toLowerCase();
    book = booksInClass.find(b => (b.slug && b.slug.includes(sub)) || (b.subject_code && b.subject_code.toLowerCase().includes(sub))) || booksInClass[0] || null;
  }

  if (!book) {
    // Fallback search default Class 4 Math
    book = getBookById("2026-primary-class-4-math") || getBooksByClass(4)[0] || null;
  }

  if (!book) return null;

  const chapters = getChaptersByBookId(book.id);
  
  // Find which chapter contains this page number
  let targetChapter: ChapterRecord | null = null;
  for (const ch of chapters) {
    if (pageNumber >= ch.start_page && pageNumber <= ch.end_page) {
      targetChapter = ch;
      break;
    }
  }

  // If page number outside specific range, pick closest chapter or first chapter
  if (!targetChapter && chapters.length > 0) {
    targetChapter = chapters.find(c => pageNumber >= c.start_page) || chapters[0];
  }

  const chapterNo = targetChapter ? (parseInt(targetChapter.chapter_number, 10) || 1) : 1;
  const chapterTitle = targetChapter ? targetChapter.chapter_title : "সাধারণ পাঠ";

  // Questions in this chapter / page
  const questionsInChapter = targetChapter ? getQuestionsByChapterId(targetChapter.chapter_id) : [];
  const questionsOnPage = questionsInChapter.filter(q => q.page_number === pageNumber);

  // Determine Page Type
  let pageType: 'theory' | 'exercise' | 'mixed' = 'theory';
  const sectionForPage = targetChapter?.sections?.find(s => s.page === pageNumber);
  const isExerciseSection = sectionForPage?.title?.includes("অনুশীলনী") || sectionForPage?.title?.includes("মূল্যায়ন");

  if (questionsOnPage.length > 0 && isExerciseSection) {
    pageType = 'exercise';
  } else if (questionsOnPage.length > 0) {
    pageType = 'mixed';
  } else if (isExerciseSection) {
    pageType = 'exercise';
  } else {
    pageType = 'theory';
  }

  // Extract core concepts
  let coreConcepts: string[] = [];
  if (targetChapter?.keywords && targetChapter.keywords.length > 0) {
    coreConcepts.push(...targetChapter.keywords);
  }
  if (targetChapter?.sections && targetChapter.sections.length > 0) {
    coreConcepts.push(...targetChapter.sections.map(s => s.title));
  }

  // Fallback: If exercise page is missing core concepts, pull from preceding theory pages of this chapter
  if (pageType === 'exercise' && coreConcepts.length <= 2 && targetChapter) {
    const precedingTheorySections = targetChapter.sections.filter(s => s.page < pageNumber && !s.title.includes("অনুশীলনী"));
    precedingTheorySections.forEach(s => coreConcepts.push(s.title));
  }

  coreConcepts = Array.from(new Set(coreConcepts)).slice(0, 5);
  if (coreConcepts.length === 0) {
    coreConcepts = [chapterTitle, `${book.class_name} ${book.subject}`];
  }

  const curriculumRules = getCurriculumRules(book.class_number, book.subject_code || book.slug, chapterTitle);
  const chapterSummary = targetChapter?.summary || `${book.class_name} ${book.subject} বিষয়ের ${chapterTitle} পাঠ্যসামগ্রী।`;

  const canonicalPageId = `cls${book.class_number}_${book.subject_code || "math"}_p${pageNumber}`;

  return {
    pageId: canonicalPageId,
    classNum: book.class_number,
    subject: book.subject || book.book_name,
    bookId: book.id,
    bookSlug: book.slug,
    bookTitle: book.book_name,
    chapterNo,
    chapterTitle,
    pageNumber,
    pageType,
    imageUrl: getPageImageUrl(book.slug, pageNumber),
    chapterContext: {
      coreConcepts,
      curriculumRules,
      chapterSummary,
    },
  };
}

/**
 * Get all page contexts for a given chapter
 */
export async function getPagesByChapter(bookId: string, chapterNo: number): Promise<NCTBPageMetadata[]> {
  const book = getBookById(bookId);
  if (!book) return [];

  const chapters = getChaptersByBookId(book.id);
  const chapter = chapters.find(c => (parseInt(c.chapter_number, 10) || 0) === chapterNo) || chapters[chapterNo - 1];
  if (!chapter) return [];

  const pages: NCTBPageMetadata[] = [];
  for (let p = chapter.start_page; p <= chapter.end_page; p++) {
    const pageId = `cls${book.class_number}_${book.subject_code || "math"}_p${p}`;
    const ctx = await getPageContext(pageId);
    if (ctx) pages.push(ctx);
  }

  return pages;
}
