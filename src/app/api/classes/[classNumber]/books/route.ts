import { NextRequest, NextResponse } from "next/server";
import { getBooksByClass } from "@/lib/nctbDb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classNumber: string }> }
) {
  try {
    const { classNumber } = await params;
    const num = parseInt(classNumber, 10);
    if (isNaN(num) || num < 1 || num > 5) {
      return NextResponse.json(
        { success: false, error: "Invalid class number. Supported classes: 1 to 5." },
        { status: 400 }
      );
    }

    const books = getBooksByClass(num);
    return NextResponse.json({
      success: true,
      academic_year: 2026,
      class_number: num,
      total_books: books.length,
      books,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
