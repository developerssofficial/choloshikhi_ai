# NCTB Primary School Textbooks (Class 1-5) Dataset & API Documentation

## 📚 Overview
Official 2026 Academic Year Primary Curriculum Dataset & APIs for Bangladesh National Curriculum and Textbook Board (NCTB).
Covers **Class 1 to Class 5** across all **33 official primary textbooks**.

---

## 🏛️ Official Sources
- **Main Portal**: `https://nctb.gov.bd/pages/static-pages/695b9b7cc4774958d7b70a12`
- **Class 1**: `https://nctb.gov.bd/pages/static-pages/695b9adec4774958d7b708cd`
- **Class 2**: `https://nctb.gov.bd/pages/static-pages/695b9935c4774958d7b70508`
- **Class 3**: `https://nctb.gov.bd/pages/static-pages/695b9980c4774958d7b70591`
- **Class 4**: `https://nctb.gov.bd/pages/static-pages/695b99ccc4774958d7b70680`
- **Class 5**: `https://nctb.gov.bd/pages/static-pages/695b9a68c4774958d7b707a5`

---

## 📁 Dataset Folder Structure

```
data/
  2026/
    primary/
      books-manifest.json
      class-1/
        class-1-bangla/
          source/original.pdf
          book.json
          chapters.json
          questions.json
          extraction-log.json
        class-1-english/
        class-1-math/
      class-2/
        class-2-bangla/
        class-2-english/
        class-2-math/
      class-3/ (9 books)
      class-4/ (9 books)
      class-5/ (9 books)
reports/
  download-report.json
  extraction-report.json
  validation-report.json
  missing-data-report.json
  duplicate-report.json
  manual-review-report.json
```

---

## 🚀 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/classes` | Get all primary classes (1-5) and book counts |
| `GET` | `/api/classes/:classNumber/books` | Get all books for a specific class (1-5) |
| `GET` | `/api/books/:bookId` | Get single book metadata and table of contents |
| `GET` | `/api/books/:bookId/chapters` | Get all chapters/lessons for a book |
| `GET` | `/api/chapters/:chapterId` | Get single chapter details and sections |
| `GET` | `/api/chapters/:chapterId/questions` | Get all exercises and questions for a chapter |
| `GET` | `/api/questions/:questionId` | Get single question by ID |
| `GET` | `/api/questions?class=&book=&type=&page=` | Filter and paginate questions across books |
| `GET` | `/api/search?q=query` | Full-text search across books, chapters, questions |

---

## 🛠️ Maintenance & Execution Scripts

```bash
# 1. Crawl official NCTB pages
node scripts/crawl_nctb_pages.mjs

# 2. Build / Update Books Manifest
node scripts/build_primary_manifest.mjs

# 3. Generate Structured Dataset & Reports
node scripts/generate_full_primary_dataset.mjs

# 4. Run Comprehensive Validation
node scripts/run_full_validation.mjs
```
