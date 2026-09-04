import { NextRequest, NextResponse } from "next/server";
import { filterQuestions } from "@/lib/nctbDb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classNum = searchParams.get("class") ? parseInt(searchParams.get("class")!, 10) : undefined;
    const book = searchParams.get("book") || undefined;
    const chapter = searchParams.get("chapter") || undefined;
    const type = searchParams.get("type") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = filterQuestions({
      class_number: classNum,
      book_name: book,
      chapter_id: chapter,
      question_type: type,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
