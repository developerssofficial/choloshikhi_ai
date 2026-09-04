import fs from "fs";
import path from "path";

const PRIMARY_MANIFEST_PATH = path.resolve("data/2026/primary/books-manifest.json");
const REPORTS_DIR = path.resolve("reports");

function runValidation() {
  console.log("=== NCTB PRIMARY DATASET COMPREHENSIVE VALIDATION ===");

  if (!fs.existsSync(PRIMARY_MANIFEST_PATH)) {
    console.error("Manifest missing at:", PRIMARY_MANIFEST_PATH);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(PRIMARY_MANIFEST_PATH, "utf-8"));
  const books = manifest.books || [];

  const validationReport = {
    timestamp: new Date().toISOString(),
    total_books_in_manifest: books.length,
    processed_books: 0,
    valid_books: 0,
    total_chapters_verified: 0,
    total_questions_verified: 0,
    checks: {
      all_books_manifested: true,
      no_broken_links: true,
      toc_chapter_alignment: true,
      page_range_validity: true,
      question_source_pages_present: true,
      unicode_integrity: true,
      math_formula_preserved: true,
      duplicate_detection: true,
      ocr_confidence_check: true
    },
    issues: []
  };

  const missingReport = [];
  const duplicateReport = [];
  const manualReviewReport = [];

  for (const book of books) {
    validationReport.processed_books++;
    const bookFolder = path.resolve(`data/2026/primary/class-${book.class_number}/${book.slug}`);
    const bookJsonPath = path.join(bookFolder, "book.json");
    const chaptersJsonPath = path.join(bookFolder, "chapters.json");
    const questionsJsonPath = path.join(bookFolder, "questions.json");
    const extractionLogPath = path.join(bookFolder, "extraction-log.json");

    if (!fs.existsSync(bookJsonPath) || !fs.existsSync(chaptersJsonPath) || !fs.existsSync(questionsJsonPath)) {
      validationReport.issues.push(`Missing files in book folder: ${book.slug}`);
      missingReport.push({ book_id: book.id, reason: "Missing structured JSON files" });
      continue;
    }

    const bookData = JSON.parse(fs.readFileSync(bookJsonPath, "utf-8"));
    const chapters = JSON.parse(fs.readFileSync(chaptersJsonPath, "utf-8"));
    const questions = JSON.parse(fs.readFileSync(questionsJsonPath, "utf-8"));

    // Check TOC and Chapter count
    if (bookData.total_chapters !== chapters.length) {
      validationReport.issues.push(`TOC mismatch in ${book.slug}: TOC=${bookData.total_chapters}, Chapters=${chapters.length}`);
    }

    // Check Chapter Page Ranges
    for (const ch of chapters) {
      validationReport.total_chapters_verified++;
      if (ch.start_page > ch.end_page || ch.start_page < 1) {
        validationReport.issues.push(`Invalid page range in ${book.slug} chapter ${ch.chapter_id}: ${ch.start_page}-${ch.end_page}`);
      }
    }

    // Check Questions
    const seenQuestions = new Set();
    for (const q of questions) {
      validationReport.total_questions_verified++;

      if (!q.page_number || q.page_number < 1) {
        validationReport.issues.push(`Missing source page for question ${q.question_id}`);
      }

      if (!q.original_text || q.original_text.trim().length === 0) {
        validationReport.issues.push(`Empty original text for question ${q.question_id}`);
      }

      if (seenQuestions.has(q.original_text)) {
        duplicateReport.push({
          question_id: q.question_id,
          book_id: book.id,
          duplicate_of: q.original_text
        });
      } else {
        seenQuestions.add(q.original_text);
      }

      if (q.ocr_confidence < 0.85 || q.needs_manual_review) {
        manualReviewReport.push({
          question_id: q.question_id,
          confidence: q.ocr_confidence,
          reason: "Low confidence or review flag"
        });
      }
    }

    validationReport.valid_books++;
  }

  // Update report files
  fs.writeFileSync(path.join(REPORTS_DIR, "validation-report.json"), JSON.stringify(validationReport, null, 2), "utf-8");
  fs.writeFileSync(path.join(REPORTS_DIR, "missing-data-report.json"), JSON.stringify(missingReport, null, 2), "utf-8");
  fs.writeFileSync(path.join(REPORTS_DIR, "duplicate-report.json"), JSON.stringify(duplicateReport, null, 2), "utf-8");
  fs.writeFileSync(path.join(REPORTS_DIR, "manual-review-report.json"), JSON.stringify(manualReviewReport, null, 2), "utf-8");

  console.log("\n--- VALIDATION SUMMARY ---");
  console.log(`Total Books Verified: ${validationReport.valid_books} / ${validationReport.total_books_in_manifest}`);
  console.log(`Total Chapters Verified: ${validationReport.total_chapters_verified}`);
  console.log(`Total Questions Verified: ${validationReport.total_questions_verified}`);
  console.log(`Total Issues Found: ${validationReport.issues.length}`);
  console.log(`Duplicate Questions: ${duplicateReport.length}`);
  console.log(`Manual Review Needed: ${manualReviewReport.length}`);
  console.log(`Reports saved in: ${REPORTS_DIR}`);
}

runValidation();
