import { NextRequest, NextResponse } from "next/server";
import { getQuestionById } from "@/lib/nctbDb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const question = getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { success: false, error: `Question not found for ID: ${questionId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
