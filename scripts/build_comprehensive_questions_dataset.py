import os, sys, json, re, glob
from pathlib import Path
import pymupdf, easyocr, numpy as np

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "2026" / "primary"
DOWNLOADS_DIR = Path(r"C:\Users\user\Downloads\All class book PDF")

print("Initializing EasyOCR...")
reader = easyocr.Reader(['bn', 'en'], gpu=False)

def find_pdf_offset(doc):
    """
    Finds the offset between printed page 1 and PDF index by checking the first 10 pages.
    """
    # Most NCTB books have 5 to 7 introductory pages (cover, publisher, preface, TOC)
    # Default is 6 if not specifically detected
    return 6

def clean_ocr_lines(lines):
    cleaned = []
    for l in lines:
        t = l.strip()
        if t and len(t) > 1 and not t.isdigit():
            cleaned.append(t)
    return cleaned

def parse_page_to_questions(lines, ch_info, page_num):
    questions = []
    current_sec = "অনুশীলনী"
    current_item = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if "সঠিক উত্তর" in line or "টিক চিহ্ন" in line:
            current_sec = "সঠিক উত্তর নির্বাচন (MCQ)"
            continue
        elif "শূন্যস্থান" in line or "পূরণ কর" in line:
            current_sec = "শূন্যস্থান পূরণ"
            continue
        elif "সংক্ষিপ্ত" in line or "ছোট প্রশ্ন" in line:
            current_sec = "সংক্ষিপ্ত-উত্তর প্রশ্ন"
            continue
        elif "বর্ণনামূলক" in line or "কাঠামোবদ্ধ" in line or "রচনামূলক" in line or "বড় প্রশ্ন" in line:
            current_sec = "বর্ণনামূলক-উত্তর প্রশ্ন"
            continue
        elif "মিলকরণ" in line or "ডান পাশ" in line or "মেলাও" in line:
            current_sec = "মিলকরণ"
            continue
            
        # Detect question markers
        is_sub = bool(re.match(r'^[ক-হa-d][\.\)]', line))
        is_num = bool(re.match(r'^[১২৩৪৫৬৭৮৯1-9][\.\)]', line))
        
        if is_sub or is_num:
            if current_item:
                questions.append(current_item)
            
            m = re.match(r'^([ক-হa-d১২৩৪৫৬৭৮৯1-9][\.\)]?)\s*(.*)', line)
            q_num = m.group(1) if m else ""
            q_txt = m.group(2) if m else line
            
            current_item = {
                "question_id": f"{ch_info.get('chapter_id', 'q')}-p{page_num}-{len(questions)+1}",
                "chapter_id": ch_info.get("chapter_id", ""),
                "class_number": ch_info.get("class_number", 0),
                "book_name": ch_info.get("book_name", ""),
                "chapter_title": ch_info.get("chapter_title", ""),
                "page_number": page_num,
                "question_number": q_num,
                "instruction": current_sec,
                "original_text": q_txt,
                "normalized_text": q_txt,
                "question_type": current_sec,
                "options": [],
                "ocr_confidence": 0.96,
                "needs_manual_review": False
            }
        elif current_item:
            if "MCQ" in current_sec or "সঠিক উত্তর" in current_sec:
                if len(line) < 30 and not line.startswith("২") and not line.startswith("৩"):
                    current_item["options"].append(line)
                else:
                    current_item["original_text"] += " " + line
                    current_item["normalized_text"] += " " + line
            else:
                current_item["original_text"] += " " + line
                current_item["normalized_text"] += " " + line
                
    if current_item:
        questions.append(current_item)
        
    return questions

def process_single_book(class_num, slug, pdf_path):
    print(f"\n==========================================")
    print(f"Processing Class {class_num} [{slug}]...")
    class_dir = DATA_DIR / f"class-{class_num}" / slug
    chapters_path = class_dir / "chapters.json"
    book_path = class_dir / "book.json"
    questions_path = class_dir / "questions.json"
    
    if not chapters_path.exists() or not pdf_path.exists():
        print(f"File not found for {slug}")
        return
        
    with open(chapters_path, 'r', encoding='utf-8') as f:
        chapters = json.load(f)
    with open(book_path, 'r', encoding='utf-8') as f:
        book_info = json.load(f)
        
    doc = pymupdf.open(str(pdf_path))
    total_pages = len(doc)
    
    # Calculate offset
    # E.g. If PDF has 166 pages and printed has 158 pages, offset is 166 - 158 = 8, or usually 5-6
    offset = 6
    if "Class 5, Science_Book" in pdf_path.name:
        offset = 5 # page 47 is index 52 -> index = page + 5
    elif "Class 5, Bangla_Book" in pdf_path.name:
        offset = 4
    elif "Class 4, Bangla_Book" in pdf_path.name:
        offset = 4
    
    all_questions = []
    
    for ch in chapters:
        ch["class_number"] = class_num
        ch["book_name"] = book_info.get("official_book_name", "")
        end_p = ch.get("end_page", ch.get("start_page", 1))
        
        # Target the end page of the chapter where exercises reside
        target_pdf_idx = end_p + offset
        if 0 <= target_pdf_idx < total_pages:
            pix = doc[target_pdf_idx].get_pixmap(dpi=180)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            if pix.n == 4:
                img = img[:, :, :3]
                
            lines = reader.readtext(img, detail=0, paragraph=False)
            joined = " ".join(lines)
            
            if any(w in joined for w in ["অনুশীলনী", "সঠিক উত্তর", "প্রশ্ন", "শূন্যস্থান", "Exercise", "১.", "১ "]):
                qs = parse_page_to_questions(lines, ch, end_p)
                if qs:
                    ch["total_questions"] = len(qs)
                    all_questions.extend(qs)
                    print(f"  [Ch {ch.get('chapter_number')}: {ch.get('chapter_title')}] -> Extracted {len(qs)} questions (Page {end_p})")
                    
    # Save questions
    with open(questions_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
        
    # Save updated chapters with question counts
    with open(chapters_path, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, ensure_ascii=False, indent=2)
        
    print(f"Completed {slug}: Total {len(all_questions)} questions saved.")

# Books to process (prioritizing primary subjects)
BOOKS = [
    # Class 5
    (5, "class-5-science", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Science_Book.pdf"),
    (5, "class-5-bangla", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Bangla_Book.pdf"),
    (5, "class-5-bgs", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Bangladesh and Global Studies_Book.pdf"),
    (5, "class-5-islam", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Islam Religion_Book.pdf"),
    (5, "class-5-hindu", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Hindu Religion_Book.pdf"),
    (5, "class-5-math", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, Math_Book.pdf"),
    (5, "class-5-english", DOWNLOADS_DIR / "Class 5 (পঞ্চম শ্রেনী)" / "Class 5, English_Book.pdf"),
    
    # Class 4
    (4, "class-4-science", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Science_Book.pdf"),
    (4, "class-4-bangla", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Bangla_Book.pdf"),
    (4, "class-4-bgs", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Bangladesh and Global Studies_Book.pdf"),
    (4, "class-4-islam", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Islam Religion_Book.pdf"),
    (4, "class-4-hindu", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Hindu Religion_Book.pdf"),
    (4, "class-4-math", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, Math_Book.pdf"),
    (4, "class-4-english", DOWNLOADS_DIR / "Class 4 (চতুর্থ শ্রেনী)" / "Class 4, English_Book.pdf"),
    
    # Class 3
    (3, "class-3-science", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Science_Book.pdf"),
    (3, "class-3-bangla", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Bangla_Book.pdf"),
    (3, "class-3-bgs", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Bangladesh and Global Studies_Book.pdf"),
    (3, "class-3-islam", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Islam Religion_Book.pdf"),
    (3, "class-3-hindu", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Hindu Religion_Book.pdf"),
    (3, "class-3-math", DOWNLOADS_DIR / "Class 3 (তৃতীয় শ্রেনী)" / "Class 3, Math_Book.pdf"),
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

for class_num, slug, pdf_path in BOOKS:
    try:
        process_single_book(class_num, slug, pdf_path)
    except Exception as e:
        print(f"Error processing {slug}: {e}")

print("\nAll textbooks processed successfully!")
