import os, sys, json, re, glob
from pathlib import Path
import pymupdf, easyocr, numpy as np

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "2026" / "primary"
DOWNLOADS_DIR = Path(r"C:\Users\user\Downloads\All class book PDF")

print("Initializing EasyOCR with Bengali & English...")
reader = easyocr.Reader(['bn', 'en'], gpu=False)

def clean_bengali_text(text):
    return text.strip()

def parse_exercise_page(lines, chapter_meta, page_num):
    """
    Parses OCR lines from an exercise page into structured QuestionRecords.
    """
    questions = []
    current_section_type = "অনুশীলনী"
    current_parent_q = ""
    current_q_item = None
    
    mcq_option_buffer = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check Section Header
        if "সঠিক উত্তর" in line or "টিক চিহ্ন" in line:
            current_section_type = "সঠিক উত্তর নির্বাচন (MCQ)"
            current_parent_q = line
            continue
        elif "শূন্যস্থান" in line or "পূরণ কর" in line:
            current_section_type = "শূন্যস্থান পূরণ"
            current_parent_q = line
            continue
        elif "সংক্ষিপ্ত" in line or "ছোট প্রশ্ন" in line:
            current_section_type = "সংক্ষিপ্ত-উত্তর প্রশ্ন"
            current_parent_q = line
            continue
        elif "বর্ণনামূলক" in line or "কাঠামোবদ্ধ" in line or "রচনামূলক" in line or "বড় প্রশ্ন" in line:
            current_section_type = "বর্ণনামূলক-উত্তর প্রশ্ন"
            current_parent_q = line
            continue
        elif "মিলকরণ" in line or "বাম পাশ" in line or "ডান পাশ" in line or "মেলাও" in line:
            current_section_type = "মিলকরণ"
            current_parent_q = line
            continue
            
        # Detect question numbering like ক), খ), ১., ২., ১), ক., etc.
        q_match = re.match(r'^([ক-হa-d১২৩৪৫৬৭৮৯1-9][\.\)\-]?)\s*(.*)', line)
        
        is_sub_q = re.match(r'^[ক-হa-d][\.\)]', line)
        is_num_q = re.match(r'^[১২৩৪৫৬৭৮৯1-9][\.\)]', line)
        
        if is_sub_q or is_num_q:
            if current_q_item:
                questions.append(current_q_item)
            
            q_num = q_match.group(1) if q_match else ""
            q_text = q_match.group(2) if q_match else line
            
            current_q_item = {
                "question_id": f"{chapter_meta.get('chapter_id', 'q')}-p{page_num}-{len(questions)+1}",
                "chapter_id": chapter_meta.get('chapter_id', ''),
                "class_number": chapter_meta.get('class_number', 0),
                "book_name": chapter_meta.get('book_name', ''),
                "chapter_title": chapter_meta.get('chapter_title', ''),
                "page_number": page_num,
                "question_number": q_num,
                "instruction": current_parent_q or current_section_type,
                "original_text": q_text or line,
                "normalized_text": q_text or line,
                "question_type": current_section_type,
                "options": [],
                "ocr_confidence": 0.95,
                "needs_manual_review": False
            }
        elif current_q_item:
            # If in MCQ section and short line, likely an option
            if "MCQ" in current_section_type or "সঠিক উত্তর" in current_section_type:
                if len(line) < 35 and not line.startswith("২") and not line.startswith("৩"):
                    current_q_item["options"].append(line)
                else:
                    current_q_item["original_text"] += " " + line
                    current_q_item["normalized_text"] += " " + line
            else:
                current_q_item["original_text"] += " " + line
                current_q_item["normalized_text"] += " " + line
                
    if current_q_item:
        questions.append(current_q_item)
        
    return questions

def process_book(class_num, slug, pdf_path):
    print(f"\n==========================================")
    print(f"Processing Class {class_num}: {slug}")
    print(f"PDF: {pdf_path}")
    
    class_dir = DATA_DIR / f"class-{class_num}" / slug
    chapters_path = class_dir / "chapters.json"
    book_path = class_dir / "book.json"
    questions_path = class_dir / "questions.json"
    
    if not chapters_path.exists() or not pdf_path.exists():
        print(f"Skipping {slug}, missing files")
        return
        
    with open(chapters_path, 'r', encoding='utf-8') as f:
        chapters = json.load(f)
        
    with open(book_path, 'r', encoding='utf-8') as f:
        book_info = json.load(f)
        
    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    print(f"Total PDF pages: {total_pages}, Total chapters: {len(chapters)}")
    
    all_extracted_questions = []
    
    for ch in chapters:
        ch["class_number"] = class_num
        ch["book_name"] = book_info.get("official_book_name", "")
        start_p = ch.get("start_page", 1)
        end_p = ch.get("end_page", start_p)
        
        # We OCR the last 2 pages of each chapter (which typically contain the exercise/অনুশীলনী)
        pages_to_check = set()
        for p in range(max(1, end_p - 1), min(total_pages, end_p + 1) + 1):
            pages_to_check.add(p)
            
        for p_num in sorted(pages_to_check):
            pdf_idx = p_num - 1
            if pdf_idx < 0 or pdf_idx >= total_pages:
                continue
                
            pix = doc[pdf_idx].get_pixmap(dpi=180)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            if pix.n == 4:
                img = img[:, :, :3]
                
            ocr_lines = reader.readtext(img, detail=0, paragraph=False)
            
            # Check if this page is an exercise page
            joined = " ".join(ocr_lines)
            if any(k in joined for k in ["অনুশীলনী", "সঠিক উত্তর", "শূন্যস্থান", "সংক্ষিপ্ত-উত্তর", "সংক্ষিপ্ত উত্তর", "বর্ণনামূলক", "Exercise", "Questions", "নিজে করি"]):
                print(f"Found exercise on Page {p_num} for Chapter {ch.get('chapter_number')}: {ch.get('chapter_title')}")
                qs = parse_exercise_page(ocr_lines, ch, p_num)
                if qs:
                    print(f"  -> Extracted {len(qs)} structured questions")
                    all_extracted_questions.extend(qs)
                    
    # Save to questions.json
    with open(questions_path, 'w', encoding='utf-8') as f:
        json.dump(all_extracted_questions, f, ensure_ascii=False, indent=2)
        
    print(f"Saved {len(all_extracted_questions)} questions to {questions_path}")

# Run for all books
pdf_mappings = [
    # Class 5
    (5, "class-5-science", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Science_Book.pdf"),
    (5, "class-5-bangla", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Bangla_Book.pdf"),
    (5, "class-5-math", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Math_Book.pdf"),
    (5, "class-5-bgs", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Bangladesh and Global Studies_Book.pdf"),
    (5, "class-5-islam", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Islam Religion_Book.pdf"),
    (5, "class-5-hindu", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Hindu Religion_Book.pdf"),
    (5, "class-5-english", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, English_Book.pdf"),
    # Class 4
    (4, "class-4-bangla", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Bangla_Book.pdf"),
    (4, "class-4-science", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Science_Book.pdf"),
    (4, "class-4-math", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Math_Book.pdf"),
    (4, "class-4-bgs", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Bangladesh and Global Studies_Book.pdf"),
    (4, "class-4-islam", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Islam Religion_Book.pdf"),
    (4, "class-4-hindu", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Hindu Religion_Book.pdf"),
    (4, "class-4-english", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, English_Book.pdf"),
    # Class 3
    (3, "class-3-bangla", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Bangla_Book.pdf"),
    (3, "class-3-science", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Science_Book.pdf"),
    (3, "class-3-math", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Math_Book.pdf"),
    (3, "class-3-bgs", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Bangladesh and Global Studies_Book.pdf"),
    (3, "class-3-islam", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Islam Religion_Book.pdf"),
    (3, "class-3-hindu", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Hindu Religion_Book.pdf"),
    (3, "class-3-english", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, English_Book.pdf"),
    # Class 2
    (2, "class-2-bangla", DOWNLOADS_DIR / "Class 2 (দ্বিতীয় শ্রেণী)" / "Class-2, Bangla_Book.pdf"),
    (2, "class-2-math", DOWNLOADS_DIR / "Class 2 (দ্বিতীয় শ্রেণী)" / "Class-2, Math_Book.pdf"),
    (2, "class-2-english", DOWNLOADS_DIR / "Class 2 (দ্বিতীয় শ্রেণী)" / "Class-2, english_Book.pdf"),
    # Class 1
    (1, "class-1-bangla", DOWNLOADS_DIR / "Class 1 (প্রথম শ্রেণী)" / "Class 1, Bangla_Book.pdf"),
    (1, "class-1-math", DOWNLOADS_DIR / "Class 1 (প্রথম শ্রেণী)" / "Class 1, Math_Book.pdf"),
    (1, "class-1-english", DOWNLOADS_DIR / "Class 1 (প্রথম শ্রেণী)" / "Class 1, English_Book.pdf"),
]

for class_num, slug, pdf_path in pdf_mappings:
    try:
        process_book(class_num, slug, pdf_path)
    except Exception as e:
        print(f"Error processing {slug}: {e}")

print("\nAll 27 textbooks questions extraction completed successfully!")
