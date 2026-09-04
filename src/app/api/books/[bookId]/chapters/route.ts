import { NextRequest, NextResponse } from "next/server";
import { getBookById, getChaptersByBookId } from "@/lib/nctbDb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const book = getBookById(bookId);
    if (!book) {
      return NextResponse.json(
        { success: false, error: `Book not found for ID: ${bookId}` },
        { status: 404 }
      );
    }

    const chapters = getChaptersByBookId(book.id);
    return NextResponse.json({
      success: true,
      book_id: book.id,
      book_name: book.book_name,
      class_number: book.class_number,
      total_chapters: chapters.length,
      chapters,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
