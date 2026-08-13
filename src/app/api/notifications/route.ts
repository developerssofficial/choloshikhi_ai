import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/* ===================================================================
   GET /api/notifications — List user notifications
   POST /api/notifications — Create notification (system/internal)
   PATCH /api/notifications — Mark as read
   =================================================================== */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    let query = supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Count unread
    const { count: unreadCount } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    return NextResponse.json({
      notifications: data || [],
      unreadCount: unreadCount || 0,
    });
  } catch (err: any) {
    console.error("Notifications GET error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, type, title, body, actionUrl, metadata } = await req.json();

    if (!userId || !type || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        action_url: actionUrl || null,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification: data });
  } catch (err: any) {
    console.error("Notifications POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, notificationIds, markAll } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (markAll) {
      await supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
    } else if (notificationIds?.length > 0) {
      await supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .in("id", notificationIds);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notifications PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
