import os, sys, json, re
from pathlib import Path
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "2026" / "primary"
PDF_BASE = Path(r"C:\Users\user\Downloads\All class book PDF")

print(f"Data directory: {DATA_DIR}")
print(f"PDF base: {PDF_BASE}")

# Comprehensive book definitions with authentic chapter breakdowns, page-by-page illustrations, and exercises
from comprehensive_books_data import ALL_COMPREHENSIVE_BOOKS

def process_and_save_all():
    total_books = 0
    total_chapters = 0
    total_questions = 0
    
    for book_key, book_data in ALL_COMPREHENSIVE_BOOKS.items():
        class_num = book_data["class_number"]
        slug = book_data["slug"]
        book_name = book_data["book_name"]
        chapters = book_data["chapters"]
        questions = book_data["questions"]
        
        class_dir = DATA_DIR / f"class-{class_num}" / slug
        class_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Save Chapters
        ch_path = class_dir / "chapters.json"
        with open(ch_path, "w", encoding="utf-8") as f:
            json.dump(chapters, f, ensure_ascii=False, indent=2)
            
        # 2. Save Questions
        q_path = class_dir / "questions.json"
        with open(q_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
            
        # 3. Save / Update Book Metadata
        b_path = class_dir / "book.json"
        book_meta = {
            "id": f"2026-primary-class-{class_num}-{slug.replace(f'class-{class_num}-', '')}",
            "slug": slug,
            "academic_year": 2026,
            "level": "primary",
            "class_number": class_num,
            "class_name": f"শ্রেণি {class_num}" if class_num > 1 else "প্রথম শ্রেণি",
            "book_name": book_name,
            "normalized_book_name": book_name,
            "subject": book_data.get("subject", book_name),
            "total_chapters": len(chapters),
            "table_of_contents": [f"পাঠ {c.get('chapter_number', '')}: {c.get('chapter_title', '')} (পৃষ্ঠা {c.get('start_page', '')}-{c.get('end_page', '')})" for c in chapters],
            "total_questions": len(questions)
        }
        with open(b_path, "w", encoding="utf-8") as f:
            json.dump(book_meta, f, ensure_ascii=False, indent=2)
            
        total_books += 1
        total_chapters += len(chapters)
        total_questions += len(questions)
        print(f"✅ Class {class_num} [{slug}]: {len(chapters)} chapters, {len(questions)} questions saved.")
        
    print(f"\n🎉 Successfully processed all {total_books} books! Total Chapters: {total_chapters}, Total Questions: {total_questions}")

if __name__ == "__main__":
    process_and_save_all()
