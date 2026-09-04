import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/sessions - List user's sessions (filtered by mode if provided)
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    let query = supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at, mode")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (mode) {
      query = query.eq("mode", mode);
    }

    let data: any = null;
    let error: any = null;

    const result = await query;
    data = result.data;
    error = result.error;

    // Fallback if 'mode' column doesn't exist yet in the database schema
    if (error && error.message?.includes("mode")) {
      const fallback = await supabase
        .from("chat_sessions")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return NextResponse.json({ sessions: data || [] });
  } catch (error: any) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

// POST /api/sessions - Create new session with mode
export async function POST(req: NextRequest) {
  try {
    const { title, mode } = await req.json();
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionMode = mode || "normal";
    let insertObj: any = { user_id: userId, title: title || "New Chat", mode: sessionMode };

    let data: any = null;
    let error: any = null;

    const result = await supabase
      .from("chat_sessions")
      .insert(insertObj)
      .select("id, title, created_at, updated_at, mode")
      .single();

    data = result.data;
    error = result.error;

    // Fallback if 'mode' column doesn't exist yet in the database schema
    if (error && error.message?.includes("mode")) {
      const fallback = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, title: title || "New Chat" })
        .select("id, title, created_at, updated_at")
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error("Session create error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
