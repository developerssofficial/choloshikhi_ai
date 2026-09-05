import os, sys, json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "2026" / "primary"

def save_book_questions(class_num, slug, questions_list):
    q_path = DATA_DIR / f"class-{class_num}" / slug / "questions.json"
    ch_path = DATA_DIR / f"class-{class_num}" / slug / "chapters.json"
    
    if not q_path.parent.exists():
        q_path.parent.mkdir(parents=True, exist_ok=True)
        
    with open(q_path, 'w', encoding='utf-8') as f:
        json.dump(questions_list, f, ensure_ascii=False, indent=2)
        
    if ch_path.exists():
        with open(ch_path, 'r', encoding='utf-8') as f:
            chapters = json.load(f)
        for ch in chapters:
            ch_qs = [q for q in questions_list if q.get("chapter_id") == ch.get("chapter_id")]
            ch["total_questions"] = len(ch_qs)
        with open(ch_path, 'w', encoding='utf-8') as f:
            json.dump(chapters, f, ensure_ascii=False, indent=2)
            
    print(f"Saved {len(questions_list)} questions for Class {class_num} [{slug}]")

# Class 4 Bangla Authentic Questions
c4_bangla_questions = [
    # Lesson 1: রূপময় বাংলাদেশ
    {
        "question_id": "2026-c4-bn-ch1-q1",
        "chapter_id": "2026-primary-class-4-bangla-ch-1",
        "class_number": 4,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "রূপময় বাংলাদেশ",
        "page_number": 5,
        "question_number": "১",
        "instruction": "১. শব্দগুলো পাঠ থেকে খুঁজে বের করি এবং অর্থ বলি",
        "original_text": "রূপময়, ষড়ঋতু, অপরূপ, তরঙ্গ, রূপসী",
        "normalized_text": "রূপময়, ষড়ঋতু, অপরূপ, তরঙ্গ, রূপসী",
        "question_type": "শব্দার্থ ও বাক্য তৈরি",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c4-bn-ch1-q2",
        "chapter_id": "2026-primary-class-4-bangla-ch-1",
        "class_number": 4,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "রূপময় বাংলাদেশ",
        "page_number": 5,
        "question_number": "২ (ক)",
        "instruction": "২. ঘরের ভেতরের শব্দগুলো খালি জায়গায় বসিয়ে বাক্য তৈরি করি",
        "original_text": "বাংলাদেশ একটি ............... দেশ।",
        "normalized_text": "বাংলাদেশ একটি রূপময় দেশ।",
        "question_type": "শূন্যস্থান পূরণ",
        "options": ["রূপময়", "ষড়ঋতু", "তরঙ্গ"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c4-bn-ch1-q3",
        "chapter_id": "2026-primary-class-4-bangla-ch-1",
        "class_number": 4,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "রূপময় বাংলাদেশ",
        "page_number": 5,
        "question_number": "৩ (ক)",
        "instruction": "৩. প্রশ্নের উত্তর বলি ও লিখি",
        "original_text": "বাংলাদেশে কয়টি ঋতু আছে এবং তাদের নাম কী কী?",
        "normalized_text": "বাংলাদেশে কয়টি ঋতু আছে এবং তাদের নাম কী কী?",
        "question_type": "সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c4-bn-ch1-q4",
        "chapter_id": "2026-primary-class-4-bangla-ch-1",
        "class_number": 4,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "রূপময় বাংলাদেশ",
        "page_number": 5,
        "question_number": "৩ (খ)",
        "instruction": "৩. প্রশ্নের উত্তর বলি ও লিখি",
        "original_text": "বর্ষা ঋতুতে প্রকৃতির কেমন রূপ দেখা যায়?",
        "normalized_text": "বর্ষা ঋতুতে প্রকৃতির কেমন রূপ দেখা যায়?",
        "question_type": "বর্ণনামূলক-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    }
]

# Class 2 Math Authentic Questions
c2_math_questions = [
    # Chapter 1: সংখ্যা ও স্থানীয় মান
    {
        "question_id": "2026-c2-math-ch1-q1",
        "chapter_id": "2026-primary-class-2-math-ch-1",
        "class_number": 2,
        "book_name": "প্রাথমিক গণিত",
        "chapter_title": "সংখ্যা ও স্থানীয় মান",
        "page_number": 15,
        "question_number": "১",
        "instruction": "১. কথায় ও অঙ্কে লিখি",
        "original_text": "পঁচিশ (২৫), সাতচল্লিশ (৪৭), উনসত্তর (৬৯), পঁচানব্বই (৯৫)",
        "normalized_text": "পঁচিশ (২৫), সাতচল্লিশ (৪৭), উনসত্তর (৬৯), পঁচানব্বই (৯৫)",
        "question_type": "অঙ্কে ও কথায় লেখা",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c2-math-ch1-q2",
        "chapter_id": "2026-primary-class-2-math-ch-1",
        "class_number": 2,
        "book_name": "প্রাথমিক গণিত",
        "chapter_title": "সংখ্যা ও স্থানীয় মান",
        "page_number": 15,
        "question_number": "২ (ক)",
        "instruction": "২. স্থানীয় মান নির্ণয় করি",
        "original_text": "৪৮ সংখ্যাটিতে ৪ এর স্থানীয় মান কত এবং ৮ এর স্থানীয় মান কত?",
        "normalized_text": "৪৮ সংখ্যাটিতে ৪ এর স্থানীয় মান কত এবং ৮ এর স্থানীয় মান কত?",
        "question_type": "স্থানীয় মান সমস্যা",
        "options": ["৪ দশ = ৪০, ৮ একক = ৮"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c2-math-ch1-q3",
        "chapter_id": "2026-primary-class-2-math-ch-1",
        "class_number": 2,
        "book_name": "প্রাথমিক গণিত",
        "chapter_title": "সংখ্যা ও স্থানীয় মান",
        "page_number": 15,
        "question_number": "৩",
        "instruction": "৩. ছোট থেকে বড় সাজাই",
        "original_text": "৩৫, ২৯, ৮৪, ৫১, ১২ সংখ্যাগুলোকে ছোট থেকে বড় ক্রমে সাজাও।",
        "normalized_text": "৩৫, ২৯, ৮৪, ৫১, ১২ সংখ্যাগুলোকে ছোট থেকে বড় ক্রমে সাজাও।",
        "question_type": "ক্রমবিন্যাস",
        "options": ["১২, ২৯, ৩৫, ৫১, ৮৪"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    }
]

# Class 1 Bangla Authentic Questions
c1_bangla_questions = [
    # Lesson 9: বাঘ ও রাখাল
    {
        "question_id": "2026-c1-bn-ch9-q1",
        "chapter_id": "2026-primary-class-1-bangla-ch-9",
        "class_number": 1,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "বাঘ ও রাখাল",
        "page_number": 14,
        "question_number": "১",
        "instruction": "১. ছবি দেখে বলি ও প্রশ্নের উত্তর দিই",
        "original_text": "রাখাল ছেলেটি মাঠে কী করত?",
        "normalized_text": "রাখাল ছেলেটি মাঠে কী করত?",
        "question_type": "মৌখিক ও সংক্ষিপ্ত প্রশ্ন",
        "options": ["গরু চরাত"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c1-bn-ch9-q2",
        "chapter_id": "2026-primary-class-1-bangla-ch-9",
        "class_number": 1,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "বাঘ ও রাখাল",
        "page_number": 14,
        "question_number": "২",
        "instruction": "২. ছবি দেখে বলি ও প্রশ্নের উত্তর দিই",
        "original_text": "রাখাল কীভাবে গ্রামবাসীদের বোকা বানাত?",
        "normalized_text": "রাখাল কীভাবে গ্রামবাসীদের বোকা বানাত?",
        "question_type": "সংক্ষিপ্ত প্রশ্ন",
        "options": ["মিথ্যা 'বাঘ এসেছে বাঘ এসেছে' বলে চিৎকার করত"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c1-bn-ch9-q3",
        "chapter_id": "2026-primary-class-1-bangla-ch-9",
        "class_number": 1,
        "book_name": "আমার বাংলা বই",
        "chapter_title": "বাঘ ও রাখাল",
        "page_number": 14,
        "question_number": "৩",
        "instruction": "৩. নীতিশিক্ষা বলি",
        "original_text": "গল্পের মাধ্যমে আমরা কী শিখলাম?",
        "normalized_text": "গল্পের মাধ্যমে আমরা কী শিখলাম?",
        "question_type": "নীতিশিক্ষা প্রশ্ন",
        "options": ["কখনো দুষ্টুমি করে মিথ্যা কথা বলতে নেই"],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    }
]

save_book_questions(4, "class-4-bangla", c4_bangla_questions)
save_book_questions(2, "class-2-math", c2_math_questions)
save_book_questions(1, "class-1-bangla", c1_bangla_questions)
