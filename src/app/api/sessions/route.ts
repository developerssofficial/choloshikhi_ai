import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/sessions - List user's sessions
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ sessions: data || [] });
  } catch (error: any) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

// POST /api/sessions - Create new session
export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: title || "New Chat" })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error("Session create error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
