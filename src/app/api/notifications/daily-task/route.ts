import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

/* ===================================================================
   POST /api/notifications/daily-task
   
   Generates a daily learning task reminder for the user.
   Checks if user has active tasks → creates reminder notification.
   Also generates a personalized daily tip based on their goals.
   =================================================================== */

interface DailyTaskResult {
  notificationsCreated: number;
  activeTasks: number;
  messages: string[];
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const result: DailyTaskResult = {
      notificationsCreated: 0,
      activeTasks: 0,
      messages: [],
    };

    // ── 1. Check for active (running/paused) task executions ───
    const { data: activeExecutions } = await supabase
      .from("task_executions")
      .select("id, title, task_type, status, updated_at")
      .eq("user_id", userId)
      .in("status", ["running", "paused", "pending"]);

    if (activeExecutions && activeExecutions.length > 0) {
      result.activeTasks = activeExecutions.length;

      for (const exec of activeExecutions) {
        // Check if we already sent a reminder today
        const today = new Date().toISOString().split("T")[0];
        const { data: existingReminder } = await supabase
          .from("user_notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "task_reminder")
          .gte("created_at", `${today}T00:00:00Z`)
          .lte("created_at", `${today}T23:59:59Z`)
          .ilike("body", `%${exec.title}%`)
          .limit(1);

        if (!existingReminder || existingReminder.length === 0) {
          // Calculate time since last activity
          const lastActive = new Date(exec.updated_at);
          const now = new Date();
          const hoursSince = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));

          let timeContext = "";
          if (hoursSince < 1) timeContext = "এইমাত্র";
          else if (hoursSince < 24) timeContext = `${hoursSince} ঘণ্টা আগে`;
          else timeContext = `${Math.floor(hoursSince / 24)} দিন আগে`;

          const notificationBody = `"${exec.title}" টাস্ক ${timeContext} আপডেট হয়েছে। এখনই চালিয়ে যান!`;

          await supabase.from("user_notifications").insert({
            user_id: userId,
            type: "task_reminder",
            title: "টাস্ক রিমাইন্ডার",
            body: notificationBody,
            action_url: "/chat",
            metadata: { executionId: exec.id, taskType: exec.task_type },
          });

          result.notificationsCreated++;
          result.messages.push(notificationBody);
        }
      }
    }

    // ── 2. Generate daily learning tip ─────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const { data: existingDaily } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "daily_task")
      .gte("created_at", `${today}T00:00:00Z`)
      .limit(1);

    if (!existingDaily || existingDaily.length === 0) {
      // Check user's learning goals
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("learning_goals, daily_task_enabled")
        .eq("user_id", userId)
        .single();

      if (prefs?.daily_task_enabled !== false) {
        const goals = prefs?.learning_goals || [];
        let dailyTip = "";

        if (goals.length > 0) {
          // Pick a random goal and create a micro-task
          const randomGoal = goals[Math.floor(Math.random() * goals.length)];
          dailyTip = `আজকের মাইক্রো-টাস্ক: "${randomGoal}" সম্পর্কে ১০ মিনিট পড়ুন।`;
        } else {
          // Generic daily tip
          const tips = [
            "আজকে একটা নতুন বিষয় সম্পর্কে ৫ মিনিট পড়ুন।",
            "গতকালের শেখানো বিষয়টা আবার মনে করে দেখুন।",
            "একটা ছোট প্র্যাকটিস প্রবলেম সমাধান করুন।",
            "কোনো একটা টিউটোরিয়াল ভিডিও দেখুন।",
            "নতুন কোনো টুল বা ফ্রেমওয়ার্ক সম্পর্কে জানুন।",
          ];
          dailyTip = tips[Math.floor(Math.random() * tips.length)];
        }

        await supabase.from("user_notifications").insert({
          user_id: userId,
          type: "daily_task",
          title: "আজকের দৈনিক টাস্ক",
          body: dailyTip,
          action_url: "/chat",
          metadata: { date: today },
        });

        result.notificationsCreated++;
        result.messages.push(dailyTip);
      }
    }

    // ── 3. Check for milestones/achievements ───────────────────
    const { count: completedCount } = await supabase
      .from("task_executions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    const totalCompleted = completedCount || 0;
    const milestones = [1, 5, 10, 25, 50, 100];

    if (milestones.includes(totalCompleted)) {
      const { data: existingMilestone } = await supabase
        .from("user_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "achievement")
        .ilike("body", `%${totalCompleted}টি টাস্ক%`)
        .limit(1);

      if (!existingMilestone || existingMilestone.length === 0) {
        await supabase.from("user_notifications").insert({
          user_id: userId,
          type: "achievement",
          title: "অর্জন!",
          body: `অভিনন্দন! আপনি ${totalCompleted}টি টাস্ক সম্পন্ন করেছেন!`,
          metadata: { milestone: totalCompleted },
        });
        result.notificationsCreated++;
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Daily task error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
