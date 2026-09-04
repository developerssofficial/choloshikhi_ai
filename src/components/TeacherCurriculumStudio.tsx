"use client";

import { useState, useEffect } from "react";

export interface SelectedTeacherLesson {
  classNumber: number;
  className: string;
  bookId: string;
  bookName: string;
  subject: string;
  icon: string;
  chapterId?: string;
  chapterNumber?: string;
  chapterTitle?: string;
  chapterType?: string;
  startPage?: number;
  endPage?: number;
  summary?: string;
  totalLessons?: number;
}

interface ChapterItem {
  chapter_id: string;
  chapter_number: string;
  chapter_title: string;
  chapter_type: string;
  author?: string | null;
  start_page: number;
  end_page: number;
  summary: string;
  sections?: Array<{ title: string; page: number }>;
}

interface BookItem {
  id: string;
  name: string;
  subject: string;
  icon: string;
  totalLessons: number;
  sampleLessons: string[];
}

const PRIMARY_CLASSES_DATA: Array<{
  classNumber: number;
  className: string;
  icon: string;
  desc: string;
  books: BookItem[];
}> = [
  {
    classNumber: 1,
    className: "১ম শ্রেণি (Class 1)",
    icon: "🌱",
    desc: "৩টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-1-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 46,
        sampleLessons: ["ইতল বিতল (ছড়া)", "ভোর হলো (ছড়া)", "ছুটি (ছড়া)", "হাঁট্টিমা টিম টিম"],
      },
      {
        id: "2026-primary-class-1-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 30,
        sampleLessons: ["Greetings & Farewells", "Alphabet A to Z", "Numbers 1-10", "Rhyme: Two Little Blackbirds"],
      },
      {
        id: "2026-primary-class-1-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 18,
        sampleLessons: ["তুলনা করি ও গণনা (১-১০)", "যোগের প্রাথমিক ধারণা", "বিয়োগের ধারণা", "সহজ জ্যামিতিক আকৃতি"],
      },
    ],
  },
  {
    classNumber: 2,
    className: "২য় শ্রেণি (Class 2)",
    icon: "🌿",
    desc: "৩টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-2-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 29,
        sampleLessons: ["পাঠ ১: আমার পরিচয়", "পাঠ ৪: ডালিমকুমার ও কঙ্কনবর্তী", "পাঠ ৮: সিংহ আর ইঁদুরের গল্প", "পাঠ ১৫: কাজের আনন্দ", "পাঠ ২১: ছয় ঋতু", "পাঠ ২৭: দুখু মিয়ার জীবন"],
      },
      {
        id: "2026-primary-class-2-english",
        name: "English for Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 28,
        sampleLessons: ["Unit 1: Greetings & Introductions", "Unit 6: Days of the Week", "Rhyme: Rain, Rain, Go Away", "Unit 12: The Golden Goose"],
      },
      {
        id: "2026-primary-class-2-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 10,
        sampleLessons: ["সংখ্যা ও স্থানীয় মান (১-১০০)", "হাতে রেখে যোগ ও বিয়োগ", "গুণের নামতা (১-১০)", "বাংলাদেশি মুদ্রা ও টাকা-পয়সা"],
      },
    ],
  },
  {
    classNumber: 3,
    className: "৩য় শ্রেণি (Class 3)",
    icon: "🌳",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-3-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["ছবি ও কথা (আমাদের বন্ধুরা)", "চল্ চল্ চল্ (রণসংগীত)", "কুঁজো বুড়ির গল্প", "তালগাছ (কবিতা)"],
      },
      {
        id: "2026-primary-class-3-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 25,
        sampleLessons: ["Unit 1: Introducing a Teacher", "Unit 5: Commands & Instructions", "Unit 10: My Family", "Unit 15: The Crow"],
      },
      {
        id: "2026-primary-class-3-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 10,
        sampleLessons: ["সংখ্যা (১-১০০০০)", "চার অঙ্কের যোগ ও বিয়োগ", "গুণ ও ভাগ", "ভগ্নাংশের ধারণা"],
      },
      {
        id: "2026-primary-class-3-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 4,
        sampleLessons: ["আমাদের পরিবেশ ও জীব-জড়", "জীব ও জড়ের পার্থক্য", "উদ্ভিদ ও প্রাণী", "স্বাস্থ্যবিধি ও পানি"],
      },
      {
        id: "2026-primary-class-3-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 4,
        sampleLessons: ["প্রাকৃতিক ও সামাজিক পরিবেশ", "আমাদের সমাজ ও পরিবার", "যানবাহন ও যোগাযোগ", "বাংলাদেশের রূপ"],
      },
      {
        id: "2026-primary-class-3-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 4,
        sampleLessons: ["আকাইদ ও ঈমান", "ইবাদত ও সালাত", "আখলাক বা চরিত্র", "কুরআন মাজিদ শিক্ষা"],
      },
      {
        id: "2026-primary-class-3-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "দেব-দেবী ও পূজা", "সদাচার ও নৈতিকতা", "ধর্মগ্রন্থের কাহিনি"],
      },
      {
        id: "2026-primary-class-3-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 4,
        sampleLessons: ["গৌতম বুদ্ধের জীবন", "ত্রিরত্ন বন্দনা", "পঞ্চশীল", "জাতকের গল্প"],
      },
      {
        id: "2026-primary-class-3-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "যিশু খ্রিষ্টের জীবন", "প্রার্থনা ও আদেশ", "সততা ও সেবা"],
      },
    ],
  },
  {
    classNumber: 4,
    className: "৪র্থ শ্রেণি (Class 4)",
    icon: "📚",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-4-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["বাংলাদেশের প্রকৃতি", "পালকির গান (কবিতা)", "বড় রাজা ছোট রাজা", "বীরপুরুষ (কবিতা)"],
      },
      {
        id: "2026-primary-class-4-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 24,
        sampleLessons: ["Unit 1: About Me", "Unit 7: Traffic Rules", "Unit 12: Days in a Calendar", "Unit 20: Food & Habits"],
      },
      {
        id: "2026-primary-class-4-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["বড় সংখ্যা ও স্থানীয় মান", "যোগ, বিয়োগ, গুণ ও ভাগ", "গাণিতিক প্রতীক", "গুণিতক ও গুণনীয়ক (লসাগু-গসাগু)"],
      },
      {
        id: "2026-primary-class-4-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 4,
        sampleLessons: ["জীব ও পরিবেশ", "উদ্ভিদ ও প্রাণীর খাদ্যশৃঙ্খল", "মাটি ও পানি দূষণ", "পদার্থ ও শক্তির রূপান্তর"],
      },
      {
        id: "2026-primary-class-4-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 4,
        sampleLessons: ["আমাদের পরিবেশ ও সমাজ", "সমাজে পরস্পরের সহযোগিতা", "বাংলাদেশের ভৌগোলিক রূপ", "নাগরিক অধিকার ও কর্তব্য"],
      },
      {
        id: "2026-primary-class-4-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 4,
        sampleLessons: ["ঈমান ও তাওহিদ", "পবিত্রতা ও সালাত", "আখলাকে হামিদা", "নবী-রাসুলগণের জীবনী"],
      },
      {
        id: "2026-primary-class-4-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 4,
        sampleLessons: ["ঈশ্বরের রূপ", "ধর্মগ্রন্থ গীতা ও রামায়ণ", "মহাপুরুষদের জীবনী", "সত্যবাদিতা"],
      },
      {
        id: "2026-primary-class-4-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 4,
        sampleLessons: ["বুদ্ধের ধর্মোপদেশ", "অষ্টশীল", "বৌদ্ধ তীর্থস্থান", "অহিংসা পরম ধর্ম"],
      },
      {
        id: "2026-primary-class-4-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 4,
        sampleLessons: ["বাইবেল পরিচিতি", "যিশুর অলৌকিক কাজ", "দশ আদেশ", "প্রতিবেশীর প্রতি ভালোবাসা"],
      },
    ],
  },
  {
    classNumber: 5,
    className: "৫ম শ্রেণি (Class 5)",
    icon: "🎓",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-5-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 18,
        sampleLessons: ["এই দেশ এই মানুষ", "সংকল্প (কবিতা - কাজী নজরুল ইসলাম)", "সুন্দরবনের প্রাণী", "হাতি আর শিয়ালের গল্প", "বীরের রক্তে স্বাধীন এ দেশ"],
      },
      {
        id: "2026-primary-class-5-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 25,
        sampleLessons: ["Unit 1: Hello!", "Unit 3: Saikat's Family", "Unit 6: Eat Healthy", "Unit 9: Occupations", "Unit 19: The Liberation War Museum"],
      },
      {
        id: "2026-primary-class-5-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["চার প্রক্রিয়া সম্পর্কিত সমস্যাবলি", "লসাগু ও গসাগু", "ভগ্নাংশ ও দশমিক", "গড় ও শতকরা", "জ্যামিতি ও পরিমাপ"],
      },
      {
        id: "2026-primary-class-5-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 14,
        sampleLessons: ["আমাদের পরিবেশ ও বাস্তুসংস্থান", "পানিচক্র ও পানি বিশুদ্ধকরণ", "পদার্থ ও শক্তি", "মহাবিশ্ব ও আবহাওয়া-জলবায়ু"],
      },
      {
        id: "2026-primary-class-5-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বিজিএস",
        icon: "🇧🇩",
        totalLessons: 12,
        sampleLessons: ["আমাদের মুক্তিযুদ্ধ (১৯৭১)", "ব্রিটিশ শাসন", "বাংলাদেশের ঐতিহাসিক নিদর্শন", "মানবাধিকার ও নারী-পুরুষ সমতা"],
      },
      {
        id: "2026-primary-class-5-islam",
        name: "ইসলাম শিক্ষা",
        subject: "ইসলাম শিক্ষা",
        icon: "🌙",
        totalLessons: 5,
        sampleLessons: ["আকাইদ ও বিশ্বাস", "ইবাদত (সালাত, সাওম, জাকাত)", "আখলাক ও নৈতিকতা", "কুরআন তিলাওয়াত ও তাজবিদ"],
      },
      {
        id: "2026-primary-class-5-hindu",
        name: "হিন্দুধর্ম শিক্ষা",
        subject: "হিন্দুধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের মহিমা", "ধর্মীয় অনুশাসন ও উৎসব", "শ্রীমদ্ভগবদ্গীতা", "মহাপুরুষদের জীবনী"],
      },
      {
        id: "2026-primary-class-5-buddhist",
        name: "বৌদ্ধধর্ম শিক্ষা",
        subject: "বৌদ্ধধর্ম",
        icon: "☸️",
        totalLessons: 5,
        sampleLessons: ["বুদ্ধের মহাপরিনির্বাণ", "চার আর্যসত্য ও অষ্টাঙ্গিক মার্গ", "ধর্মপদ", "শান্তি ও মৈত্রী"],
      },
      {
        id: "2026-primary-class-5-christian",
        name: "খ্রিষ্টধর্ম শিক্ষা",
        subject: "খ্রিষ্টধর্ম",
        icon: "✝️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের উদ্ধার পরিকল্পনা", "যিশু খ্রিষ্টের ক্রুশারোহণ ও পুনরুত্থান", "খ্রিষ্টীয় মণ্ডলী", "ক্ষমা ও পুনর্মিলন"],
      },
    ],
  },
];

interface TeacherCurriculumStudioProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelected: SelectedTeacherLesson | null;
  onSelectLesson: (selected: SelectedTeacherLesson, autoPrompt?: string) => void;
}

export default function TeacherCurriculumStudio({
  isOpen,
  onClose,
  currentSelected,
  onSelectLesson,
}: TeacherCurriculumStudioProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(
    currentSelected?.classNumber || 2
  );
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const currentClassData =
    PRIMARY_CLASSES_DATA.find((c) => c.classNumber === selectedClassNum) ||
    PRIMARY_CLASSES_DATA[1];

  // Set default selected book
  useEffect(() => {
    if (currentSelected?.bookId) {
      const b = currentClassData.books.find((x) => x.id === currentSelected.bookId);
      if (b) setSelectedBook(b);
      else setSelectedBook(currentClassData.books[0]);
    } else {
      setSelectedBook(currentClassData.books[0]);
    }
  }, [selectedClassNum, currentSelected?.bookId, currentClassData.books]);

  // Fetch real chapters for selected book
  useEffect(() => {
    if (!selectedBook?.id) return;
    setLoadingChapters(true);
    fetch(`/api/books/${selectedBook.id}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.chapters) {
          setChapters(data.chapters);
        } else {
          setChapters([]);
        }
      })
      .catch(() => setChapters([]))
      .finally(() => setLoadingChapters(false));
  }, [selectedBook?.id]);

  if (!isOpen) return null;

  const handleChapterClick = (ch: ChapterItem, autoPrompt?: string) => {
    if (!selectedBook) return;
    onSelectLesson(
      {
        classNumber: currentClassData.classNumber,
        className: currentClassData.className,
        bookId: selectedBook.id,
        bookName: selectedBook.name,
        subject: selectedBook.subject,
        icon: selectedBook.icon,
        totalLessons: selectedBook.totalLessons,
        chapterId: ch.chapter_id,
        chapterNumber: ch.chapter_number,
        chapterTitle: ch.chapter_title,
        chapterType: ch.chapter_type,
        startPage: ch.start_page,
        endPage: ch.end_page,
        summary: ch.summary,
      },
      autoPrompt
    );
    onClose();
  };

  const filteredChapters = chapters.filter(
    (c) =>
      c.chapter_title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.chapter_number.includes(searchFilter) ||
      c.summary.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#0e0f17] border border-emerald-500/30 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden shadow-2xl shadow-emerald-500/15 flex flex-col relative">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Studio Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] backdrop-blur-md shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/25">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  শিক্ষক পাঠশালা ও কারিকুলাম স্টুডিও
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                  NCTB 2026 OFFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                শ্রেণি, বিষয় ও নির্দিষ্ট পাঠ/অধ্যায় নির্বাচন করো — শিক্ষক সরাসরি সেই পাঠটি ধরে ধরে বোঝাবেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Studio Body: Split View (Left: Class & Book Explorer, Right: Chapters & Actions) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative z-10">
          {/* Left Column: Step 1 (Class Selector) & Step 2 (Subjects) */}
          <div className="w-full md:w-80 border-r border-white/[0.08] flex flex-col bg-black/30 p-4 space-y-4 overflow-y-auto shrink-0">
            {/* Step 1: Class Tabs */}
            <div>
              <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                ১. শ্রেণি নির্বাচন করো:
              </label>
              <div className="grid grid-cols-5 md:grid-cols-1 gap-1.5">
                {PRIMARY_CLASSES_DATA.map((c) => {
                  const isSelected = c.classNumber === selectedClassNum;
                  return (
                    <button
                      key={c.classNumber}
                      onClick={() => setSelectedClassNum(c.classNumber)}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 text-left ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border-emerald-400/80 text-white shadow-lg shadow-emerald-500/15"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{c.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{c.className.split(" ")[0]}</p>
                          <p className="text-[10px] text-slate-400 truncate hidden md:block">{c.desc}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 hidden md:block" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Subject Cards for Selected Class */}
            <div className="flex-1">
              <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                ২. বিষয় নির্বাচন করো ({currentClassData.books.length}টি বই):
              </label>
              <div className="space-y-1.5">
                {currentClassData.books.map((book) => {
                  const isSelected = selectedBook?.id === book.id;
                  return (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left group ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-600/40 via-teal-600/20 to-emerald-700/20 border-emerald-400 text-white shadow-xl shadow-emerald-500/20 scale-[1.01]"
                          : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] hover:border-white/[0.15] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-xl shrink-0">
                          {book.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {book.name}
                          </h4>
                          <span className="text-[10px] text-emerald-400/90 font-mono">
                            {book.totalLessons}টি পাঠ
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-white">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Step 3 (Interactive Table of Contents & Chapter Actions) */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0c0d14] overflow-hidden">
            {/* Top Bar for Right Column */}
            <div className="px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-white/[0.01]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedBook?.icon}</span>
                  <h3 className="text-sm font-bold text-white truncate">
                    {currentClassData.className} — {selectedBook?.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    {chapters.length || selectedBook?.totalLessons}টি পাঠ
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  নিচের যেকোনো পাঠে ক্লিক করে সরাসরি পড়া শুরু করতে পারো:
                </p>
              </div>

              {/* Search in Chapters */}
              <div className="w-48 sm:w-64">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="পাঠ বা বিষয় সার্চ করো..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Chapters Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {loadingChapters ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <div className="w-7 h-7 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  <span className="text-xs">অফিশিয়াল সূচিপত্র লোড হচ্ছে...</span>
                </div>
              ) : filteredChapters.length > 0 ? (
                filteredChapters.map((ch) => {
                  const isCurrentActive =
                    currentSelected?.chapterId === ch.chapter_id ||
                    (currentSelected?.bookId === selectedBook?.id &&
                      currentSelected?.chapterNumber === ch.chapter_number);

                  return (
                    <div
                      key={ch.chapter_id}
                      className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                        isCurrentActive
                          ? "bg-gradient-to-r from-emerald-900/30 via-emerald-800/15 to-transparent border-emerald-400 text-white shadow-xl shadow-emerald-500/10"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] hover:border-emerald-500/40 text-slate-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold">
                              পাঠ {ch.chapter_number}
                            </span>
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {ch.chapter_title}
                            </h4>
                            <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
                              {ch.chapter_type}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md font-mono">
                              পৃষ্ঠা: {ch.start_page}–{ch.end_page}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">
                            {ch.summary}
                          </p>

                          {ch.sections && ch.sections.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-slate-500">
                              <span>সেকশন:</span>
                              {ch.sections.map((sec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-slate-400 bg-white/[0.03] px-1.5 py-0.5 rounded text-[10px]"
                                >
                                  {sec.title} (পৃষ্ঠা {sec.page})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick 1-Click Action Buttons for this Chapter */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                          <button
                            onClick={() =>
                              handleChapterClick(
                                ch,
                                `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}" পাঠে কী কী বিষয় আছে এবং এর মূল গল্প/বিষয়বস্তু সহজ ও প্রাঞ্জল ভাষায় সুন্দর করে বুঝিয়ে দাও।`
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                          >
                            <span>📖 পাঠটি বুঝিয়ে দাও</span>
                          </button>
                          <button
                            onClick={() =>
                              handleChapterClick(
                                ch,
                                `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}"-এর সকল অনুশীলনী ও প্রশ্নোত্তর ধাপে ধাপে সমাধান করে দাও।`
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 hover:text-white text-xs font-medium transition-all"
                            title="অনুশীলনীর প্রশ্ন সমাধান করো"
                          >
                            ❓ প্রশ্ন সমাধান
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  কোনো পাঠ পাওয়া যায়নি। সার্চ ফিল্টার পরিবর্তন করো।
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-between bg-black/50 text-xs text-slate-400 shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              নির্বাচিত: <strong className="text-white">{currentClassData.className} • {selectedBook?.name}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white transition-colors text-xs font-medium"
          >
            বন্ধ করো
          </button>
        </div>
      </div>
    </div>
  );
}
