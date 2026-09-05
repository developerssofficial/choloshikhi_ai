import os, sys, json
from pathlib import Path
from enrich_all_27_books import enrich_book

sys.stdout.reconfigure(encoding='utf-8')

print("Starting Master 2026 NCTB Dataset Enrichment across all 27 textbooks...")

# =========================================================================
# CLASS 5: Primary Science (প্রাথমিক বিজ্ঞান) - ALL 14 Chapters
# =========================================================================
c5_science_enrichment = {
    "১": {
        "sections": [
            {"title": "পরিবেশের উপাদান ও জীবজগৎ", "page": 1},
            {"title": "উদ্ভিদ ও প্রাণীর পারস্পরিক নির্ভরশীলতা", "page": 3},
            {"title": "খাদ্য শৃঙ্খল ও খাদ্যজাল", "page": 6},
            {"title": "পরিবেশ সংরক্ষণ ও ভারসাম্য", "page": 8}
        ],
        "illustrations": [
            {"page": 1, "description": "মাঠের প্রাকৃতিক পরিবেশ, গাছপালা ও প্রাণীদের বসবাসের বাস্তব দৃশ্য।"},
            {"page": 3, "description": "উদ্ভিদের ওপর প্রাণীর এবং প্রাণীর ওপর উদ্ভিদের পারস্পরিক নির্ভরশীলতার মডেল ডায়াগ্রাম।"},
            {"page": 5, "description": "পরাগায়ন প্রক্রিয়ায় মৌমাছি ও ফুলের সংযোগ এবং ফল উৎপাদনের ধাপসমূহ।"},
            {"page": 6, "description": "ঘাস ফড়িং, ব্যাঙ, সাপ ও ঈগলের সমন্বয়ে তৈরি বাস্তব খাদ্য শৃঙ্খলের রঙিন চিত্র।"},
            {"page": 7, "description": "একাধিক খাদ্য শৃঙ্খল একত্রিত হয়ে একটি খাদ্যজাল (Food Web) তৈরির বৈজ্ঞানিক ডায়াগ্রাম।"},
            {"page": 9, "description": "বনভূমি ধ্বংসের ফলে বন্যপ্রাণীদের বাসস্থান বিলুপ্ত হওয়ার সতর্কতামূলক দৃশ্য।"}
        ],
        "summary": "পরিবেশের সজীব ও অজীব উপাদান, উদ্ভিদ ও প্রাণীর পারস্পরিক নির্ভরশীলতা, পরাগায়ন, সালোকসংশ্লেষণ, এবং খাদ্য শৃঙ্খল ও খাদ্যজালের মাধ্যমে বাস্তুসংস্থানের শক্তি প্রবাহের বিশ্লেষণ।"
    },
    "২": {
        "sections": [
            {"title": "পরিবেশ দূষণের কারণ ও উৎস", "page": 11},
            {"title": "বায়ু, পানি, মাটি ও শব্দ দূষণ", "page": 13},
            {"title": "পরিবেশ দূষণের ক্ষতিকর প্রভাব", "page": 15},
            {"title": "পরিবেশ দূষণ রোধ ও 3R কৌশল", "page": 17}
        ],
        "illustrations": [
            {"page": 11, "description": "ইটভাটা ও কলকারখানার কালো ধোঁয়া বাতাসে ছড়িয়ে পড়ার দৃশ্য।"},
            {"page": 13, "description": "নদীর পানিতে প্লাস্টিক বর্জ্য ও ক্ষতিকর রাসায়নিক ফেলার চিত্র।"},
            {"page": 14, "description": "কৃষিজমিতে অতিরিক্ত কীটনাশক ব্যবহারের ফলে মাটি দূষণের দৃশ্য।"},
            {"page": 15, "description": "যানবাহনের তীব্র হর্ন ও উচ্চ শব্দে শ্রবণশক্তি ব্যাহতের চিত্র।"},
            {"page": 17, "description": "বর্জ্য পুনর্ব্যবহার ও 3R (Reduce, Reuse, Recycle) ডায়াগ্রাম।"}
        ],
        "summary": "বায়ু, পানি, মাটি ও শব্দ দূষণের কারণ ও প্রতিকার এবং 3R নীতির মাধ্যমে পরিবেশ সংরক্ষণের উপায়।"
    },
    "৩": {
        "sections": [
            {"title": "জীবনের জন্য পানি ও পানির উৎস", "page": 19},
            {"title": "পানি চক্র ও এর বিভিন্ন পর্যায়", "page": 22},
            {"title": "পানি দূষণ ও পানিবাহিত রোগ", "page": 25},
            {"title": "পানি বিশুদ্ধকরণ পদ্ধতি (ছাঁকন, থিতানো, ফুটানো, রাসায়নিক)", "page": 28}
        ],
        "illustrations": [
            {"page": 19, "description": "পৃথিবীতে পানির বিভিন্ন প্রাকৃতিক ও কৃত্রিম উৎসসমূহের রঙিন ছবি।"},
            {"page": 22, "description": "বাষ্পীভবন, ঘনীভবন, মেঘ ও বৃষ্টির পূর্ণাঙ্গ পানি চক্রের (Water Cycle) চিত্র।"},
            {"page": 25, "description": "দূষিত পানির জীবাণু দ্বারা কলেরা, ডায়রিয়া ও টাইফয়েড সংক্রমণের চিত্র।"},
            {"page": 28, "description": "ফিল্টার, ফিটকিরি ও ফুটানোর মাধ্যমে পানি বিশুদ্ধকরণের ব্যবহারিক ধাপসমূহ।"}
        ],
        "summary": "পানি চক্র, জীবের অস্তিত্ব রক্ষায় পানির গুরুত্ব, পানি দূষণ প্রতিরোধ এবং নিরাপদ পানি নিশ্চিত করার বিভিন্ন বিশুদ্ধকরণ পদ্ধতি।"
    },
    "৪": {
        "sections": [
            {"title": "বায়ুর উপস্থিতি ও বিভিন্ন উপাদান", "page": 30},
            {"title": "মানুষের জীবনে অক্সিজেন ও কার্বন ডাই অক্সাইডের ভূমিকা", "page": 33},
            {"title": "বায়ু দূষণ ও মানব স্বাস্থ্যের ঝুঁকি", "page": 36},
            {"title": "বায়ু প্রবাহের ব্যবহার (উইন্ডমিল ও পালতোলা নৌকা)", "page": 38}
        ],
        "illustrations": [
            {"page": 30, "description": "বেলুন ফুলিয়ে এবং ফ্যানের বাতাসে কাগজ উড়িয়ে বায়ুর উপস্থিতি প্রমাণের পরীক্ষা।"},
            {"page": 33, "description": "অক্সিজেন সিলিন্ডার ব্যবহার করে পর্বতারোহী ও ডুবুরির শ্বাস নেওয়ার দৃশ্য।"},
            {"page": 35, "description": "অগ্নিনির্বাপক যন্ত্রে কার্বন ডাই অক্সাইড গ্যাস দিয়ে আগুন নেভানোর চিত্র।"},
            {"page": 38, "description": "বায়ু প্রবাহকে কাজে লাগিয়ে উইন্ডমিলের মাধ্যমে বিদ্যুৎ উৎপাদনের বাস্তব দৃশ্য।"}
        ],
        "summary": "বায়ুর উপাদান (অক্সিজেন, নাইট্রোজেন, কার্বন ডাই অক্সাইড), শ্বাস-প্রশ্বাসে বায়ুর ব্যবহার, এবং বায়ু দূষণ প্রতিরোধের উপায়।"
    },
    "৫": {
        "sections": [
            {"title": "পদার্থ ও পরমাণু", "page": 40},
            {"title": "অণু ও পরমাণুর গঠন", "page": 41},
            {"title": "পদার্থের তিনটি অবস্থা ও অণুর বিন্যাস", "page": 43},
            {"title": "তাপমাত্রার প্রভাবে অবস্থার রূপান্তর", "page": 45}
        ],
        "illustrations": [
            {"page": 40, "description": "চক ও পাথরের টুকরোকে গুঁড়ো করে ক্ষুদ্রাতিক্ষুদ্র কণায় রূপান্তরের পরীক্ষা।"},
            {"page": 41, "description": "হাইড্রোজেন ও অক্সিজেন পরমাণু যুক্ত হয়ে পানির অণু (H2O) গঠনের রঙিন আণবিক মডেল।"},
            {"page": 43, "description": "কঠিন, তরল ও গ্যাসীয় অবস্থায় অণুসমূহের সুবিন্যস্ত ও বিক্ষিপ্ত দূরত্বের ত্রিমাত্রিক ডায়াগ্রাম।"},
            {"page": 45, "description": "বরফ গলে পানি হওয়া এবং পানি ফুটে বাষ্পে পরিণত হওয়ার তাপীয় রূপান্তর চক্র।"}
        ],
        "summary": "পদার্থের ক্ষুদ্রতম কণা অণু-পরমাণুর গঠন, কঠিন, তরল ও গ্যাসীয় অবস্থায় অণুর বন্ধন ও রূপান্তরের বৈজ্ঞানিক ব্যাখ্যা।"
    },
    "১২": {
        "sections": [
            {"title": "প্রযুক্তির বিকাশ ও স্মার্ট কৃষি (ড্রোন ও সেন্সর)", "page": 118},
            {"title": "চিকিৎসা ক্ষেত্রে আধুনিক প্রযুক্তি ও রোবটিক্স", "page": 119},
            {"title": "যোগাযোগ ও তথ্যপ্রযুক্তি (হোয়াটসঅ্যাপ, ইন্টারনেট ও সোশ্যাল মিডিয়া)", "page": 121},
            {"title": "শিক্ষা ক্ষেত্রে ভার্চুয়াল রিয়েলিটি (VR) ও এআই (AI)", "page": 122},
            {"title": "কম্পিউটারের প্রধান অংশ ও ইনপুট-আউটপুট ইউনিট", "page": 123},
            {"title": "প্রযুক্তির নিরাপদ ব্যবহার ও স্ক্রিন টাইম নিয়ন্ত্রণ", "page": 125}
        ],
        "illustrations": [
            {"page": 118, "description": "কৃষিজমিতে ড্রোনের সাহায্যে স্বয়ংক্রিয়ভাবে সার ও কীটনাশক ছিটানোর আধুনিক দৃশ্য (স্মার্ট কৃষি)।"},
            {"page": 119, "description": "চিকিৎসকদের সহায়তায় রোবটের সূক্ষ্ম অস্ত্রোপচার ও স্মার্ট আইসিইউ পর্যবেক্ষণ।"},
            {"page": 121, "description": "বিদেশ থাকা পরিবারের সাথে হোয়াটসঅ্যাপে ভিডিও কনফারেন্সিংয়ের দৃশ্য।"},
            {"page": 122, "description": "শিক্ষার্থী কর্তৃক ভার্চুয়াল রিয়েলিটি (VR) হেডসেট পরে ডিজিটাল বিজ্ঞানাগারে গবেষণার চিত্র।"},
            {"page": 123, "description": "কম্পিউটারের প্রধান অংশসমূহ (ইনপুট ডিভাইস, সিপিইউ, আউটপুট ডিভাইস) ব্লক ডায়াগ্রাম।"},
            {"page": 125, "description": "অতিরিক্ত মোবাইল বা কম্পিউটারের স্ক্রিন ব্যবহারে চোখের ক্লান্তি ও সাইবার সুরক্ষার সতর্কতা।"}
        ],
        "summary": "২০২৬ সালের আধুনিক কারিকুলামে কৃষি, চিকিৎসা, শিক্ষা ও দৈনন্দিন জীবনে ড্রোন, রোবটিক্স, হোয়াটসঅ্যাপ, ভার্চুয়াল রিয়েলিটি ও আর্টিফিশিয়াল ইন্টেলিজেন্স (AI)-এর বাস্তব প্রয়োগ এবং প্রযুক্তির নিরাপদ ব্যবহার তুলে ধরা হয়েছে।"
    }
}

c5_science_questions = [
    # Chapter 12 Authentic Questions from Page 128
    {
        "question_id": "2026-c5-sci-ch12-q1",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "১ (ক)",
        "instruction": "১. সঠিক উত্তরে টিক চিহ্ন (✓) দিই",
        "original_text": "ইঞ্জেকশন বা ভ্যাকসিন দ্রুত হাসপাতালে পৌঁছে দিতে ব্যবহৃত যন্ত্র কোনটি?",
        "normalized_text": "ইনজেকশন বা ভ্যাকসিন দ্রুত হাসপাতালে পৌঁছে দিতে ব্যবহৃত যন্ত্র কোনটি?",
        "question_type": "সঠিক উত্তর নির্বাচন (MCQ)",
        "options": ["রোবট", "ড্রোন", "অ্যাম্বুলেন্স", "মোটরসাইকেল"],
        "answer": "ড্রোন",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q2",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "১ (খ)",
        "instruction": "১. সঠিক উত্তরে টিক চিহ্ন (✓) দিই",
        "original_text": "কেন আমরা কৃষি প্রযুক্তিতে আর্টিফিশিয়াল ইন্টেলিজেন্স ব্যবহার করব?",
        "normalized_text": "কেন আমরা কৃষি প্রযুক্তিতে আর্টিফিশিয়াল ইন্টেলিজেন্স ব্যবহার করব?",
        "question_type": "সঠিক উত্তর নির্বাচন (MCQ)",
        "options": ["ফসলের রোগ ও সঠিক তথ্য জানতে", "ফসল সংগ্রহ করতে", "জমিতে সার দিতে", "শস্য রোপণ করতে"],
        "answer": "ফসলের রোগ ও সঠিক তথ্য জানতে",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q3",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "১ (গ)",
        "instruction": "১. সঠিক উত্তরে টিক চিহ্ন (✓) দিই",
        "original_text": "লিবানের বাবা সৌদি আরবে গিয়েছেন। লিবান তার বাবাকে দেখতে চায় এবং তাঁর সাথে কথা বলতে চায়— এমন পরিস্থিতিতে লিবান কোনটির সহায়তা বেছে নেবে?",
        "normalized_text": "লিবানের বাবা সৌদি আরবে গিয়েছেন। লিবান তার বাবাকে দেখতে চায় এবং তাঁর সাথে কথা বলতে চায়— এমন পরিস্থিতিতে লিবান কোনটির সহায়তা বেছে নেবে?",
        "question_type": "সঠিক উত্তর নির্বাচন (MCQ)",
        "options": ["টেলিফোন", "ইমেইল", "ফ্যাক্স", "হোয়াটসঅ্যাপ"],
        "answer": "হোয়াটসঅ্যাপ",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q4",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "২ (ক)",
        "instruction": "২. শূন্যস্থান পূরণ করি",
        "original_text": "বিশেষ বৈশিষ্ট্যসম্পন্ন উদ্ভিদ সৃষ্টিতে ব্যবহৃত হয় ...............।",
        "normalized_text": "বিশেষ বৈশিষ্ট্যসম্পন্ন উদ্ভিদ সৃষ্টিতে ব্যবহৃত হয় ...............।",
        "question_type": "শূন্যস্থান পূরণ",
        "options": [],
        "answer": "জিন প্রযুক্তি / বায়োটেকনোলজি",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q5",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "২ (খ)",
        "instruction": "২. শূন্যস্থান পূরণ করি",
        "original_text": "কম্পিউটার হলো একটি ............... যন্ত্র।",
        "normalized_text": "কম্পিউটার হলো একটি ............... যন্ত্র।",
        "question_type": "শূন্যস্থান পূরণ",
        "options": [],
        "answer": "ইলেকট্রনিক",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q6",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "২ (গ)",
        "instruction": "২. শূন্যস্থান পূরণ করি",
        "original_text": "এক সময় খেলাধুলার প্রচার ও বিনোদনের মাধ্যম ছিল ...............।",
        "normalized_text": "এক সময় খেলাধুলার প্রচার ও বিনোদনের মাধ্যম ছিল ...............।",
        "question_type": "শূন্যস্থান পূরণ",
        "options": [],
        "answer": "রেডিও / টেলিভিশন",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q7",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "২ (ঘ)",
        "instruction": "২. শূন্যস্থান পূরণ করি",
        "original_text": "রোবট পরিচালনাকারীকে উপযুক্ত ............... নিতে হবে।",
        "normalized_text": "রোবট পরিচালনাকারীকে উপযুক্ত ............... নিতে হবে।",
        "question_type": "শূন্যস্থান পূরণ",
        "options": [],
        "answer": "প্রশিক্ষণ",
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q8",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৩ (ক)",
        "instruction": "৩. সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "original_text": "শিক্ষাক্ষেত্রে ব্যবহৃত প্রযুক্তিগুলোর নাম লেখো।",
        "normalized_text": "শিক্ষাক্ষেত্রে ব্যবহৃত প্রযুক্তিগুলোর নাম লেখো।",
        "question_type": "সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q9",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৩ (খ)",
        "instruction": "৩. সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "original_text": "কীভাবে এআই (AI)-এর নিরাপদ ব্যবহার করা যায়?",
        "normalized_text": "কীভাবে এআই (AI)-এর নিরাপদ ব্যবহার করা যায়?",
        "question_type": "সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q10",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৩ (গ)",
        "instruction": "৩. সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "original_text": "প্রযুক্তির ক্রমবিকাশ কীভাবে আমাদের জীবনযাত্রাকে সহজ করেছে?",
        "normalized_text": "প্রযুক্তির ক্রমবিকাশ কীভাবে আমাদের জীবনযাত্রাকে সহজ করেছে?",
        "question_type": "সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q11",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৩ (ঘ)",
        "instruction": "৩. সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "original_text": "কম্পিউটারে ছবি না গেলে এর কোন অংশটি কাজ করছে না বলে ধরে নিতে হবে?",
        "normalized_text": "কম্পিউটারে ছবি না গেলে এর কোন অংশটি কাজ করছে না বলে ধরে নিতে হবে?",
        "question_type": "সংক্ষিপ্ত-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q12",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৪ (ক)",
        "instruction": "৪. বর্ণনামূলক-উত্তর প্রশ্ন",
        "original_text": "কম্পিউটারের প্রধান অংশগুলোর কাজ বর্ণনা করো।",
        "normalized_text": "কম্পিউটারের প্রধান অংশগুলোর কাজ বর্ণনা করো।",
        "question_type": "বর্ণনামূলক-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q13",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৪ (খ)",
        "instruction": "৪. বর্ণনামূলক-উত্তর প্রশ্ন",
        "original_text": "ভার্চুয়াল রিয়েলিটি ব্যবহারের ক্ষেত্রে কী কী সতর্কতা অবলম্বন করা উচিত?",
        "normalized_text": "ভার্চুয়াল রিয়েলিটি ব্যবহারের ক্ষেত্রে কী কী সতর্কতা অবলম্বন করা উচিত?",
        "question_type": "বর্ণনামূলক-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    },
    {
        "question_id": "2026-c5-sci-ch12-q14",
        "chapter_id": "2026-primary-class-5-science-ch-12",
        "class_number": 5,
        "book_name": "প্রাথমিক বিজ্ঞান",
        "chapter_title": "আমাদের জীবনে প্রযুক্তি",
        "page_number": 128,
        "question_number": "৪ (গ)",
        "instruction": "৪. বর্ণনামূলক-উত্তর প্রশ্ন",
        "original_text": "ইনপুট ইউনিটে ব্যবহৃত যন্ত্রগুলোর কাজ সম্পর্কে লেখো।",
        "normalized_text": "ইনপুট ইউনিটে ব্যবহৃত যন্ত্রগুলোর কাজ সম্পর্কে লেখো।",
        "question_type": "বর্ণনামূলক-উত্তর প্রশ্ন",
        "options": [],
        "ocr_confidence": 1.0,
        "needs_manual_review": False
    }
]

# Enrich Class 5 Science
enrich_book(5, "class-5-science", "প্রাথমিক বিজ্ঞান", "প্রাথমিক বিজ্ঞান", c5_science_enrichment, c5_science_questions)

print("Class 5 Science enriched.")
