import { NextRequest, NextResponse } from "next/server";
import { getChapterById } from "@/lib/nctbDb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params;
    const chapter = getChapterById(chapterId);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: `Chapter not found for ID: ${chapterId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      chapter,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
