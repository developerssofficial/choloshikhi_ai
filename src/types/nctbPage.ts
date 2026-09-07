export interface NCTBPageMetadata {
  pageId: string;           // e.g. "cls4_math_p38" or "primary_class_4_math_p38"
  classNum: number;         // 1 to 5
  subject: string;          // "math", "bangla", "science", etc.
  bookId: string;           // e.g. "2026-primary-class-4-math"
  bookSlug: string;         // e.g. "class-4-math"
  bookTitle: string;        // e.g. "প্রাথমিক গণিত"
  chapterNo: number;
  chapterTitle: string;
  pageNumber: number;
  pageType: 'theory' | 'exercise' | 'mixed';
  imageUrl: string;         // public path or fallback URL
  chapterContext: {
    coreConcepts: string[]; // e.g. ["BODMAS brackets", "Step-by-step arithmetic"]
    curriculumRules: string;// Constraints (e.g. "Do not use algebraic x/y variables, follow Class 4 unitary method")
    chapterSummary: string;
  };
}
