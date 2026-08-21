import { NextRequest, NextResponse } from "next/server";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { getSubscriptionStatus, redeemCode } from "@/lib/subscription";

// GET /api/subscription — Get user's subscription status
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ plan: "free", isUnlimited: false });
    }

    const status = await getSubscriptionStatus(authUser.id);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Subscription GET error:", error);
    return NextResponse.json({ plan: "free", isUnlimited: false });
  }
}

// POST /api/subscription — Redeem a code
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Login required to redeem codes." }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code?.trim()) {
      return NextResponse.json({ error: "Code required." }, { status: 400 });
    }

    const result = await redeemCode(authUser.id, code);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Redeem error:", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}
