import { NextResponse } from "next/server";
import { getClasses } from "@/lib/nctbDb";

export async function GET() {
  try {
    const classes = getClasses();
    return NextResponse.json({
      success: true,
      academic_year: 2026,
      education_level: "primary",
      total_classes: classes.length,
      classes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
