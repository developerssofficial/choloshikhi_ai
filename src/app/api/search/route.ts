import { NextRequest, NextResponse } from "next/server";
import { searchDataset } from "@/lib/nctbDb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const results = searchDataset(q);
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
