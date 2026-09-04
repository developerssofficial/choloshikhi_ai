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
        totalLessons: 54,
        sampleLessons: ["পাঠ ৯: বাঘ ও রাখাল", "পাঠ ১৭: ইতল বিতল", "পাঠ ২৫: ট্রেন", "পাঠ ৪২: ভোর হলো", "পাঠ ৪৬: পিঁপড়া ও পায়রার গল্প", "পাঠ ৪৮: ছুটি"],
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
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 4,
        sampleLessons: ["প্রাকৃতিক ও সামাজিক পরিবেশ", "আমাদের বাড়ি ও বিদ্যালয়", "আমাদের অধিকার ও দায়িত্ব", "যানবাহন ও যোগাযোগ"],
      },
      {
        id: "2026-primary-class-3-islam",
        name: "ইসলাম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["ঈমান ও আকাইদ", "ইবাদত ও সালাত", "আখলাক বা চরিত্র", "কুরআন মাজিদ শিক্ষা", "নবী-রাসূলগণের জীবন"],
      },
      {
        id: "2026-primary-class-3-hindu",
        name: "হিন্দুধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের স্বরূপ", "দেবী-দেবতা ও পূজা", "ধর্মগ্রন্থ ও নীতিশিক্ষা", "সদাচার ও সেবা", "মহাপুরুষ ও মহীয়সী"],
      },
      {
        id: "2026-primary-class-3-buddhist",
        name: "বৌদ্ধধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "☸️",
        totalLessons: 5,
        sampleLessons: ["গৌতম বুদ্ধের জীবন", "ত্রিরত্ন বন্দনা", "শীল ও নীতিশিক্ষা", "জাতকের গল্প", "বৌদ্ধ তীর্থস্থান"],
      },
      {
        id: "2026-primary-class-3-christian",
        name: "খ্রিষ্টধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "✝️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "যীশু খ্রিষ্টের জীবন", "প্রার্থনা ও সৎকর্ম", "দশ আজ্ঞা", "ভালোবাসা ও ক্ষমা"],
      },
    ],
  },
  {
    classNumber: 4,
    className: "৪র্থ শ্রেণি (Class 4)",
    icon: "🎓",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-4-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 20,
        sampleLessons: ["বাংলাদেশের প্রকৃতি", "পালকির গান", "বড় রাজা ছোট রাজা", "মুক্তির ছড়া", "বীরশ্রেষ্ঠদের বীরগাথা"],
      },
      {
        id: "2026-primary-class-4-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 28,
        sampleLessons: ["Unit 1: About Me", "Unit 4: Family", "Unit 9: Traffic Rules", "Unit 14: Story: The Hen and Her Chicks"],
      },
      {
        id: "2026-primary-class-4-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["বড় সংখ্যা ও স্থানীয় মান", "চার প্রক্রিয়া (যোগ-বিয়োগ-গুণ-ভাগ)", "গাণিতিক প্রতীক", "গুণনীয়ক ও গুণিতক", "ভগ্নাংশ ও দশমিক"],
      },
      {
        id: "2026-primary-class-4-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 11,
        sampleLessons: ["জীব ও পরিবেশ", "উদ্ভিদ ও প্রাণী", "মাটি ও পানি দূষণ", "খাদ্য ও পুষ্টি", "পদার্থ ও শক্তি", "আমাদের জীবনে তথ্য"],
      },
      {
        id: "2026-primary-class-4-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 16,
        sampleLessons: ["আমাদের পরিবেশ ও সমাজ", "সমাজ ও সমাজের নানা পেশা", "নাগরিক অধিকার ও দায়িত্ব", "বাংলাদেশের ভৌগোলিক অঞ্চল"],
      },
      {
        id: "2026-primary-class-4-islam",
        name: "ইসলাম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["আকাইদ ও তাওহিদ", "ইবাদত ও তাহরাত", "আখলাক ও শিষ্টাচার", "কুরআন মাজিদ শিক্ষা", "মহানবী (সা.)-এর মক্কী জীবন"],
      },
      {
        id: "2026-primary-class-4-hindu",
        name: "হিন্দুধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বর ও সৃষ্টি", "দেবদেবী ও পূজা-পার্বণ", "ধর্মগ্রন্থ ও সারসংক্ষেপ", "সদাচার ও আত্মশুদ্ধি", "মহাপুরুষদের জীবনী"],
      },
      {
        id: "2026-primary-class-4-buddhist",
        name: "বৌদ্ধধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "☸️",
        totalLessons: 5,
        sampleLessons: ["বুদ্ধের ধর্মোপদেশ", "চতুরার্য সত্য", "শীল ও সমাধি", "জাতক ও নীতিগল্প", "বৌদ্ধ উৎসব"],
      },
      {
        id: "2026-primary-class-4-christian",
        name: "খ্রিষ্টধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "✝️",
        totalLessons: 5,
        sampleLessons: ["সৃষ্টিকর্তা ঈশ্বর", "যীশু খ্রিষ্টের শিক্ষা", "পাপ ও পরিত্রাণ", "দশ আজ্ঞা ও পালন", "সেবা ও ভ্রাতৃত্ব"],
      },
    ],
  },
  {
    classNumber: 5,
    className: "৫ম শ্রেণি (Class 5)",
    icon: "🏆",
    desc: "৯টি অফিশিয়াল পাঠ্যবই",
    books: [
      {
        id: "2026-primary-class-5-bangla",
        name: "আমার বাংলা বই",
        subject: "বাংলা",
        icon: "📖",
        totalLessons: 22,
        sampleLessons: ["এই দেশ এই মানুষ", "সংকল্প (কবিতা)", "সুন্দরবনের প্রাণী", "হাতি আর শিয়ালের গল্প", "ঘাসফুল", "স্মরণীয় যাঁরা চিরদিন"],
      },
      {
        id: "2026-primary-class-5-english",
        name: "English For Today",
        subject: "ইংরেজি",
        icon: "🇬🇧",
        totalLessons: 25,
        sampleLessons: ["Unit 1: Hello!", "Unit 3: Saikat's Family", "Unit 6: Eat Healthy", "Unit 10: My Home District", "Unit 19: The Liberation War Museum"],
      },
      {
        id: "2026-primary-class-5-math",
        name: "প্রাথমিক গণিত",
        subject: "গণিত",
        icon: "📐",
        totalLessons: 14,
        sampleLessons: ["গুণ ও ভাগ প্রক্রিয়া", "চার প্রক্রিয়া সম্পর্কিত সমস্যা", "লসাগু ও গসাগু", "ভগ্নাংশ ও দশমিক", "গড়", "শতকরা", "পরিমাপ ও সময়"],
      },
      {
        id: "2026-primary-class-5-science",
        name: "প্রাথমিক বিজ্ঞান",
        subject: "বিজ্ঞান",
        icon: "🔬",
        totalLessons: 14,
        sampleLessons: ["আমাদের পরিবেশ ও খাদ্যজাল", "পরিবেশ দূষণ", "জীবনের জন্য পানি", "বায়ু ও আবহাওয়া", "পদার্থ ও শক্তি", "মহাবিশ্ব", "আমাদের জীবনে তথ্যপ্রযুক্তি"],
      },
      {
        id: "2026-primary-class-5-bgs",
        name: "বাংলাদেশ ও বিশ্বপরিচয়",
        subject: "বাংলাদেশ ও বিশ্বপরিচয়",
        icon: "🇧🇩",
        totalLessons: 12,
        sampleLessons: ["আমাদের মুক্তিযুদ্ধ (১৯৭১)", "ব্রিটিশ শাসন", "বাংলাদেশের ঐতিহাসিক স্থান", "আমাদের অর্থনীতি: কৃষি ও শিল্প", "জনসংখ্যা", "জলবায়ু ও দুর্যোগ"],
      },
      {
        id: "2026-primary-class-5-islam",
        name: "ইসলাম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕌",
        totalLessons: 5,
        sampleLessons: ["আকাইদ ও বিশ্বাস", "ইবাদত ও দৈনন্দিন জীবনে সালাত", "আখলাক ও উত্তম চরিত্র", "কুরআন মাজিদ তিলাওয়াত ও শিক্ষা", "নবী-রাসূল ও খলিফাগণের আদর্শ"],
      },
      {
        id: "2026-primary-class-5-hindu",
        name: "হিন্দুধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "🕉️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের মহিমা ও ভক্তি", "দেবদেবী ও পূজা-বিধি", "গীতা ও নীতিশিক্ষা", "সততা ও অহিংসা", "মহাপুরুষ ও সনাতন ধর্ম"],
      },
      {
        id: "2026-primary-class-5-buddhist",
        name: "বৌদ্ধধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "☸️",
        totalLessons: 5,
        sampleLessons: ["গৌতম বুদ্ধের বোধিজ্ঞান", "আর্য অষ্টাঙ্গিক মার্গ", "শীল ও ধ্যান", "জাতকের নীতিশিক্ষা", "আন্তর্জাতিক বৌদ্ধ ঐতিহ্য"],
      },
      {
        id: "2026-primary-class-5-christian",
        name: "খ্রিষ্টধর্ম ও নৈতিক শিক্ষা",
        subject: "ধর্ম",
        icon: "✝️",
        totalLessons: 5,
        sampleLessons: ["ঈশ্বরের পিতা-সুলভ ভালোবাসা", "যীশু খ্রিষ্টের অলৌকিক কাজ", "মথি লিখিত সুসমাচার", "খ্রিষ্টীয় সেবা ও সমাজকর্ম", "শান্তি ও পরোপকার"],
      },
    ],
  },
];

interface TeacherCurriculumStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: SelectedTeacherLesson, autoPrompt?: string) => void;
  currentSelected?: SelectedTeacherLesson | null;
}

export default function TeacherCurriculumStudio({
  isOpen,
  onClose,
  onSelectLesson,
  currentSelected,
}: TeacherCurriculumStudioProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(
    currentSelected?.classNumber || 1
  );
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const currentClassData =
    PRIMARY_CLASSES_DATA.find((c) => c.classNumber === selectedClassNum) ||
    PRIMARY_CLASSES_DATA[0];

  useEffect(() => {
    if (currentSelected?.bookId) {
      const foundBook = currentClassData.books.find(
        (b) => b.id === currentSelected.bookId
      );
      if (foundBook) {
        setSelectedBook(foundBook);
        return;
      }
    }
    setSelectedBook(currentClassData.books[0]);
  }, [selectedClassNum, currentClassData]);

  useEffect(() => {
    if (!selectedBook) return;

    let isMounted = true;
    setLoadingChapters(true);

    fetch(`/api/books/${selectedBook.id}/chapters`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
          setChapters(data.chapters);
        } else {
          // Fallback sample chapters if API has none
          const fallback = selectedBook.sampleLessons.map((lesson, idx) => ({
            chapter_id: `${selectedBook.id}-ch${idx + 1}`,
            chapter_number: String(idx + 1),
            chapter_title: lesson.replace(/^পাঠ \d+:\s*/, ""),
            chapter_type: "পাঠ",
            start_page: idx * 4 + 1,
            end_page: idx * 4 + 4,
            summary: `${selectedBook.name}-এর ${lesson}। বিষয়বস্তু ও অনুশীলন।`,
          }));
          setChapters(fallback);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = selectedBook.sampleLessons.map((lesson, idx) => ({
          chapter_id: `${selectedBook.id}-ch${idx + 1}`,
          chapter_number: String(idx + 1),
          chapter_title: lesson.replace(/^পাঠ \d+:\s*/, ""),
          chapter_type: "পাঠ",
          start_page: idx * 4 + 1,
          end_page: idx * 4 + 4,
          summary: `${selectedBook.name}-এর ${lesson}। বিষয়বস্তু ও অনুশীলন।`,
        }));
        setChapters(fallback);
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBook]);

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
        totalLessons: chapters.length || selectedBook.totalLessons,
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
      (c.summary && c.summary.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85">
      <div className="bg-[#0b0f17] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col relative overflow-hidden text-slate-100">
        
        {/* Studio Header (Snappy & Clean) */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#111622] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              👨‍🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  শিক্ষক পাঠশালা ও সূচিপত্র স্টুডিও
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  NCTB 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                শ্রেণি, বই ও নির্দিষ্ট পাঠ নির্বাচন করুন — শিক্ষক সরাসরি সেই পাঠের আলোকে উত্তর দেবেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
            title="বন্ধ করো"
          >
            ✕
          </button>
        </div>

        {/* Studio Body: Split View (Left: Classes & Books, Right: Chapter Table) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Classes & Subjects */}
          <div className="w-full md:w-72 border-r border-slate-800 flex flex-col bg-[#0e131d] p-3.5 space-y-3.5 overflow-y-auto shrink-0">
            {/* Step 1: Class Tabs */}
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                ১. শ্রেণি নির্বাচন:
              </span>
              <div className="grid grid-cols-5 md:grid-cols-1 gap-1">
                {PRIMARY_CLASSES_DATA.map((c) => {
                  const isSelected = c.classNumber === selectedClassNum;
                  return (
                    <button
                      key={c.classNumber}
                      onClick={() => setSelectedClassNum(c.classNumber)}
                      className={`p-2 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-900/40 border-emerald-500 text-white font-semibold shadow-sm"
                          : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{c.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs truncate">{c.className.split(" ")[0]}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 hidden md:block" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Books in Class */}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                ২. পাঠ্যবই ({currentClassData.books.length}টি):
              </span>
              <div className="space-y-1">
                {currentClassData.books.map((book) => {
                  const isSelected = selectedBook?.id === book.id;
                  return (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between group ${
                        isSelected
                          ? "bg-emerald-950/70 border-emerald-500/80 text-white shadow-sm"
                          : "bg-slate-900/50 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{book.icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                            {book.name}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {book.id === "2026-primary-class-1-bangla" ? "৫৪টি পাঠ" : `${book.totalLessons}টি পাঠ`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-white">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Complete Official Chapter Stream */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#090d14] overflow-hidden">
            {/* Top Bar for Right Column */}
            <div className="px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0d121c] shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedBook?.icon}</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                    {currentClassData.className} — {selectedBook?.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {chapters.length}টি পাঠ
                  </span>
                </div>
              </div>

              {/* Search Filter */}
              <div className="w-40 sm:w-56">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="পাঠ বা বিষয় খুঁজুন..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Chapters Stream (Super Snappy & Clean) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {loadingChapters ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
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
                      className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? "bg-emerald-950/40 border-emerald-500 text-white"
                          : "bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold shrink-0">
                            পাঠ {ch.chapter_number}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {ch.chapter_title}
                          </h4>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {ch.chapter_type}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            পৃষ্ঠা {ch.start_page}
                          </span>
                        </div>

                        {ch.summary && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {ch.summary}
                          </p>
                        )}
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            handleChapterClick(
                              ch,
                              `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}" পাঠে কী কী বিষয় আছে এবং এর মূল গল্প/বিষয়বস্তু সহজ ও প্রাঞ্জল ভাষায় সুন্দর করে বুঝিয়ে দাও।`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                        >
                          <span>📖 পাঠটি বুঝিয়ে দাও</span>
                        </button>
                        <button
                          onClick={() =>
                            handleChapterClick(
                              ch,
                              `${currentClassData.className}-এর '${selectedBook?.name}' বইয়ের "পাঠ ${ch.chapter_number}: ${ch.chapter_title}"-এর সকল অনুশীলনী ও প্রশ্নোত্তর সমাধান করে দাও।`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                          title="অনুশীলনীর প্রশ্ন সমাধান করো"
                        >
                          ❓ প্রশ্ন সমাধান
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  কোনো পাঠ পাওয়া যায়নি। সার্চ ফিল্টার পরিবর্তন করুন।
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between bg-[#111622] text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              বর্তমান নির্বাচিত: <strong className="text-white">{currentClassData.className} • {selectedBook?.name} ({chapters.length}টি পাঠ)</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors text-xs font-semibold"
          >
            বন্ধ করো
          </button>
        </div>
      </div>
    </div>
  );
}
