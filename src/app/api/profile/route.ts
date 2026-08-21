import { NextRequest, NextResponse } from "next/server";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { getSubscriptionStatus, updateDisplayName } from "@/lib/subscription";

// GET /api/profile — Get user's profile (username + display name)
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getSubscriptionStatus(authUser.id);
    return NextResponse.json({
      username: status.username,
      displayName: status.displayName,
    });
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/profile — Update display name
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { displayName } = await req.json();
    const result = await updateDisplayName(authUser.id, displayName || "");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
