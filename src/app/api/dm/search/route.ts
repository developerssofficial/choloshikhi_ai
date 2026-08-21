import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/dm/search?q=CSH_XXXXXX — Find student by username (anonymous only)
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ results: [] });

    const search = q.toUpperCase();

    // Search by exact or partial CSH_XXXXXX username
    const { data: profiles } = await supabase
      .from("student_profiles")
      .select("user_id, username")
      .neq("user_id", authUser.id)
      .ilike("username", `%${search}%`)
      .limit(10);

    return NextResponse.json({
      results: (profiles || []).map(p => ({
        userId: p.user_id,
        username: p.username,
      })),
    });
  } catch (error: any) {
    console.error("DM search error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
