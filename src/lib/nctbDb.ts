import fs from "fs";
import path from "path";

export interface BookRecord {
  id: string;
  slug: string;
  academic_year: number;
  level: string;
  class_number: number;
  class_name: string;
  book_name: string;
  normalized_book_name: string;
  subject: string;
  subject_code: string;
  language: string;
  version: string;
  official_page_url: string;
  download_links: {
    link_1: string;
    link_2: string;
    resolved_pdf_url: string;
  };
  english_version?: any;
  pdf: {
    local_path: string;
    file_name: string;
    file_size: number;
    total_pages: number;
    sha256: string;
  };
  publication: any;
  table_of_contents: string[];
  total_chapters: number;
  validation: any;
}

export interface ChapterRecord {
  chapter_id: string;
  book_id?: string;
  chapter_number: string;
  chapter_title: string;
  chapter_type: string;
  author?: string | null;
  start_page: number;
  end_page: number;
  sections: Array<{ title: string; page: number }>;
  keywords: string[];
  summary: string;
  total_questions: number;
}

export interface QuestionRecord {
  question_id: string;
  chapter_id: string;
  class_number: number;
  book_name: string;
  chapter_title: string;
  page_number: number;
  question_number: string;
  sub_question_number?: string;
  parent_question_id?: string | null;
  instruction: string;
  original_text: string;
  normalized_text: string;
  question_type: string;
  options: string[];
  marks?: number | null;
  answer?: string | null;
  image_references?: string[];
  table_references?: string[];
  duplicate_of?: string | null;
  ocr_confidence: number;
  needs_manual_review: boolean;
}

// In-Memory Cached Index
let cachedBooks: BookRecord[] | null = null;
let cachedChapters: Map<string, ChapterRecord[]> = new Map();
let cachedQuestions: Map<string, QuestionRecord[]> = new Map();
let allQuestionsList: QuestionRecord[] | null = null;

function loadDataset() {
  if (cachedBooks) return;

  const manifestPath = path.resolve(process.cwd(), "data/2026/primary/books-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    cachedBooks = [];
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  cachedBooks = manifest.books || [];

  const allQuestions: QuestionRecord[] = [];

  for (const book of cachedBooks!) {
    book.book_name = book.book_name || (book as any).official_book_name || (book as any).normalized_book_name || "";
    book.official_page_url = book.official_page_url || (book as any).official_class_page_url || "";

    const classDir = path.resolve(process.cwd(), `data/2026/primary/class-${book.class_number}/${book.slug}`);
    const bookPath = path.join(classDir, "book.json");
    const chaptersPath = path.join(classDir, "chapters.json");
    const questionsPath = path.join(classDir, "questions.json");

    if (fs.existsSync(bookPath)) {
      try {
        const fullBook = JSON.parse(fs.readFileSync(bookPath, "utf-8"));
        Object.assign(book, fullBook);
        book.book_name = fullBook.book_name || book.book_name;
      } catch {}
    }

    if (fs.existsSync(chaptersPath)) {
      const chapters: ChapterRecord[] = JSON.parse(fs.readFileSync(chaptersPath, "utf-8"));
      chapters.forEach(c => (c.book_id = book.id));
      cachedChapters.set(book.id, chapters);
    }

    if (fs.existsSync(questionsPath)) {
      const questions: QuestionRecord[] = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
      cachedQuestions.set(book.id, questions);
      allQuestions.push(...questions);
    }
  }

  allQuestionsList = allQuestions;
}

/**
 * Get all available classes
 */
export function getClasses() {
  loadDataset();
  return [
    { class_number: 1, class_name: "প্রথম শ্রেণি", total_books: 3, url: "https://nctb.gov.bd/pages/static-pages/695b9adec4774958d7b708cd" },
    { class_number: 2, class_name: "দ্বিতীয় শ্রেণি", total_books: 3, url: "https://nctb.gov.bd/pages/static-pages/695b9935c4774958d7b70508" },
    { class_number: 3, class_name: "তৃতীয় শ্রেণি", total_books: 9, url: "https://nctb.gov.bd/pages/static-pages/695b9980c4774958d7b70591" },
    { class_number: 4, class_name: "চতুর্থ শ্রেণি", total_books: 9, url: "https://nctb.gov.bd/pages/static-pages/695b99ccc4774958d7b70680" },
    { class_number: 5, class_name: "পঞ্চম শ্রেণি", total_books: 9, url: "https://nctb.gov.bd/pages/static-pages/695b9a68c4774958d7b707a5" },
  ];
}

/**
 * Get all books for a specific class number
 */
export function getBooksByClass(classNumber: number): BookRecord[] {
  loadDataset();
  return (cachedBooks || []).filter(b => b.class_number === classNumber);
}

/**
 * Get single book by ID or Slug
 */
export function getBookById(bookId: string): BookRecord | null {
  loadDataset();
  return (cachedBooks || []).find(b => b.id === bookId || b.slug === bookId) || null;
}

/**
 * Get chapters for a book
 */
export function getChaptersByBookId(bookId: string): ChapterRecord[] {
  loadDataset();
  const book = getBookById(bookId);
  if (!book) return [];
  return cachedChapters.get(book.id) || [];
}

/**
 * Get single chapter by ID
 */
export function getChapterById(chapterId: string): ChapterRecord | null {
  loadDataset();
  for (const chapters of cachedChapters.values()) {
    const found = chapters.find(c => c.chapter_id === chapterId);
    if (found) return found;
  }
  return null;
}

/**
 * Get questions for a specific chapter
 */
export function getQuestionsByChapterId(chapterId: string): QuestionRecord[] {
  loadDataset();
  return (allQuestionsList || []).filter(q => q.chapter_id === chapterId);
}

/**
 * Get single question by ID
 */
export function getQuestionById(questionId: string): QuestionRecord | null {
  loadDataset();
  return (allQuestionsList || []).find(q => q.question_id === questionId) || null;
}

/**
 * Query questions with filters
 */
export function filterQuestions(filters: {
  class_number?: number;
  book_name?: string;
  chapter_id?: string;
  question_type?: string;
  page?: number;
  limit?: number;
}) {
  loadDataset();
  let list = allQuestionsList || [];

  if (filters.class_number) {
    list = list.filter(q => q.class_number === filters.class_number);
  }
  if (filters.book_name) {
    const bn = filters.book_name.toLowerCase();
    list = list.filter(q => q.book_name.toLowerCase().includes(bn));
  }
  if (filters.chapter_id) {
    list = list.filter(q => q.chapter_id === filters.chapter_id);
  }
  if (filters.question_type) {
    const qt = filters.question_type.toLowerCase();
    list = list.filter(q => q.question_type.toLowerCase().includes(qt));
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const total = list.length;
  const total_pages = Math.ceil(total / limit);
  const data = list.slice((page - 1) * limit, page * limit);

  return {
    total,
    page,
    limit,
    total_pages,
    data
  };
}

/**
 * Search books, chapters, and questions by keyword
 */
export function searchDataset(query: string) {
  loadDataset();
  const q = (query || "").trim().toLowerCase();
  if (!q) return { query: "", matched_books: [], matched_chapters: [], matched_questions: [] };

  const matched_books = (cachedBooks || []).filter(
    b => b.book_name.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q) || b.class_name.toLowerCase().includes(q)
  );

  const matched_chapters: ChapterRecord[] = [];
  for (const chapters of cachedChapters.values()) {
    for (const c of chapters) {
      if (c.chapter_title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q) || (c.author && c.author.toLowerCase().includes(q))) {
        matched_chapters.push(c);
      }
    }
  }

  const matched_questions = (allQuestionsList || []).filter(
    qItem => qItem.original_text.toLowerCase().includes(q) || qItem.normalized_text.toLowerCase().includes(q) || qItem.instruction.toLowerCase().includes(q)
  );

  return {
    query,
    total_matches: matched_books.length + matched_chapters.length + matched_questions.length,
    matched_books: matched_books.slice(0, 10),
    matched_chapters: matched_chapters.slice(0, 20),
    matched_questions: matched_questions.slice(0, 50)
  };
}
