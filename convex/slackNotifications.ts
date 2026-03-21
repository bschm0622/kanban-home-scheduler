import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  getCurrentDayNameEST,
  getCurrentWeekIdEST,
  getYesterdayDayNameEST,
  getTodayBoundsEST,
  type DayStatus,
} from "./lib/timezone";

// Allowed user IDs for Slack notifications (household use)
const ALLOWED_USER_IDS = [
  "user_31Y39ySFpvojwkAiCFGkVjLSXX3",
  "user_31YS0l3fGGQ9XK9XLRYFPIg8Puz"
];

// --- Internal Queries ---

// Get tasks for a specific day and week (only allowed users)
export const getTasksForDay = internalQuery({
  args: {
    weekId: v.string(),
    dayName: v.union(
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday")
    ),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week_and_status", (q) =>
        q.eq("weekId", args.weekId).eq("status", args.dayName)
      )
      .collect();
    return allTasks.filter(task =>
      ALLOWED_USER_IDS.includes(task.userId) && !task.deletedAt
    );
  },
});

// Get a full day summary: tasks still on today + tasks completed today
// This fixes the broken query where completed tasks were invisible
export const getDaySummary = internalQuery({
  args: {
    weekId: v.string(),
    dayName: v.union(
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday")
    ),
  },
  handler: async (ctx, args) => {
    // Tasks still assigned to this day
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week_and_status", (q) =>
        q.eq("weekId", args.weekId).eq("status", args.dayName)
      )
      .collect();

    // Tasks completed today (they have status "completed" but completedAt is within today)
    const { startOfDay, endOfDay } = getTodayBoundsEST();
    const completedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week_and_status", (q) =>
        q.eq("weekId", args.weekId).eq("status", "completed")
      )
      .collect();

    const completedToday = completedTasks.filter(t =>
      t.completedAt && t.completedAt >= startOfDay && t.completedAt <= endOfDay &&
      ALLOWED_USER_IDS.includes(t.userId) && !t.deletedAt
    );

    const pending = pendingTasks.filter(t =>
      ALLOWED_USER_IDS.includes(t.userId) && !t.deletedAt
    );

    return { pending, completedToday };
  },
});

// Get commitment data for the week (using index instead of full table scan)
export const getCommitmentsForWeek = internalQuery({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
      .collect();

    const commitmentTasks = weekTasks.filter(t =>
      ALLOWED_USER_IDS.includes(t.userId) &&
      t.isCommitment &&
      t.commitmentWeekId === args.weekId &&
      !t.deletedAt
    );

    const completed = commitmentTasks.filter(t => t.status === "completed");
    return {
      total: commitmentTasks.length,
      completed: completed.length,
      tasks: commitmentTasks,
    };
  },
});

// Get week tasks for recap (using index instead of full table scan)
export const getWeekTasksForRecap = internalQuery({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
      .collect();

    const userTasks = weekTasks.filter(t =>
      ALLOWED_USER_IDS.includes(t.userId) && !t.deletedAt
    );
    const completed = userTasks.filter(t => t.status === "completed");
    const commitments = userTasks.filter(t => t.isCommitment);
    const completedCommitments = commitments.filter(t => t.status === "completed");

    return {
      total: userTasks.length,
      completed: completed.length,
      commitments: commitments.length,
      completedCommitments: completedCommitments.length,
    };
  },
});

// --- Slack Helpers ---

async function sendToSlack(webhookUrl: string, message: any): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${errorText}`);
  }
}

function priorityEmoji(priority: string): string {
  return priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
}

function getDayIcon(day: string): string {
  const icons: Record<string, string> = {
    monday: "💼", tuesday: "🚀", wednesday: "⚡", thursday: "💪",
    friday: "🎉", saturday: "🌞", sunday: "☀️",
  };
  return icons[day] || "📅";
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hours = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hours}:${String(m).padStart(2, '0')} ${suffix}`;
}

// --- Morning Briefing ---
// Single daily notification: today's tasks + what wasn't finished yesterday

export const sendScheduledDailyTasks = internalAction({
  args: {},
  handler: async (ctx) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("SLACK_WEBHOOK_URL not configured");
      return { success: false, error: "SLACK_WEBHOOK_URL not configured" };
    }

    const currentWeekId = getCurrentWeekIdEST();
    const today = getCurrentDayNameEST();
    const yesterday = getYesterdayDayNameEST();

    // Get today's tasks
    const todayTasks: any[] = await ctx.runQuery(internal.slackNotifications.getTasksForDay, {
      weekId: currentWeekId,
      dayName: today,
    });

    // Get yesterday's unfinished tasks (still sitting on yesterday's column)
    const yesterdayTasks: any[] = await ctx.runQuery(internal.slackNotifications.getTasksForDay, {
      weekId: currentWeekId,
      dayName: yesterday,
    });

    // Get commitment data
    const commitments = await ctx.runQuery(internal.slackNotifications.getCommitmentsForWeek, {
      weekId: currentWeekId,
    });

    // Empty-task guard: skip if nothing to report
    if (todayTasks.length === 0 && yesterdayTasks.length === 0) {
      console.log("No tasks for today or yesterday, skipping morning briefing");
      return { success: true, skipped: true };
    }

    const formattedDay = today.charAt(0).toUpperCase() + today.slice(1);
    const dayIcon = getDayIcon(today);

    const blocks: any[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `${dayIcon} Good morning! Here's your ${formattedDay}`, emoji: true }
      }
    ];

    // Yesterday's unfinished tasks
    if (yesterdayTasks.length > 0) {
      const formattedYesterday = yesterday.charAt(0).toUpperCase() + yesterday.slice(1);
      blocks.push(
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*⚠️ Unfinished from ${formattedYesterday} (${yesterdayTasks.length})*\n${yesterdayTasks.map(t =>
              `• ${t.title} [${priorityEmoji(t.priority)}]${t.isCommitment ? ' 📌' : ''}`
            ).join('\n')}`
          }
        }
      );
    }

    // Today's commitment tasks
    const commitmentTasks = todayTasks.filter(t => t.isCommitment);
    if (commitmentTasks.length > 0) {
      blocks.push(
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🎯 Today's Commitments (${commitmentTasks.length})*\n${commitmentTasks.map(t =>
              `📌 ${t.title} [${t.priority.toUpperCase()}]${t.dueTime ? ` — ⏰ ${formatTime12h(t.dueTime)}` : ''}`
            ).join('\n')}`
          }
        }
      );
    }

    // Today's other tasks
    const otherTasks = todayTasks.filter(t => !t.isCommitment);
    if (otherTasks.length > 0) {
      // Sort: tasks with due times first (chronologically), then by priority
      const withTime = otherTasks.filter(t => t.dueTime).sort((a, b) => a.dueTime!.localeCompare(b.dueTime!));
      const withoutTime = otherTasks.filter(t => !t.dueTime);

      const sorted = [...withTime, ...withoutTime];
      blocks.push(
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📋 Other Tasks (${sorted.length})*\n${sorted.map(t =>
              `• ${t.title} [${priorityEmoji(t.priority)}]${t.dueTime ? ` — ⏰ ${formatTime12h(t.dueTime)}` : ''}`
            ).join('\n')}`
          }
        }
      );
    }

    // Summary footer
    blocks.push({
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `📊 Today: ${todayTasks.length} tasks | 🎯 Weekly commitments: ${commitments.completed}/${commitments.total}`
      }]
    });

    try {
      await sendToSlack(webhookUrl, {
        blocks,
        text: `${formattedDay}'s Tasks: ${todayTasks.length} tasks`
      });
      console.log(`Morning briefing sent: ${todayTasks.length} today, ${yesterdayTasks.length} from yesterday`);
      return { success: true, todayCount: todayTasks.length, yesterdayCount: yesterdayTasks.length };
    } catch (error) {
      console.error("Failed to send morning briefing:", error);
      return { success: false, error: String(error) };
    }
  },
});

// --- Per-Task Reminder ---

export const sendTaskReminder = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { success: false, error: "No webhook" };

    // Fetch the task — it may have been completed or deleted since scheduling
    const task: any = await ctx.runQuery(internal.slackNotifications.getTaskById, {
      taskId: args.taskId,
    });

    if (!task || task.status === "completed" || task.deletedAt) {
      return { success: true, skipped: true };
    }

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: "⏰ Task Reminder", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}* is due now! ${priorityEmoji(task.priority)}${task.isCommitment ? ' 📌' : ''}${task.description ? `\n_${task.description}_` : ''}`
        }
      }
    ];

    try {
      await sendToSlack(webhookUrl, { blocks, text: `⏰ Reminder: ${task.title}` });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});

// Internal query to fetch a single task by ID
export const getTaskById = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// --- Weekly Recap (Sunday evening) ---

export const sendWeeklyRecap = internalAction({
  handler: async (ctx) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { success: false };

    const currentWeekId = getCurrentWeekIdEST();
    const stats = await ctx.runQuery(internal.slackNotifications.getWeekTasksForRecap, {
      weekId: currentWeekId,
    });

    // Skip if no tasks this week
    if (stats.total === 0) {
      console.log("No tasks this week, skipping weekly recap");
      return { success: true, skipped: true };
    }

    const completionRate = Math.round((stats.completed / stats.total) * 100);
    const commitmentRate = stats.commitments > 0
      ? Math.round((stats.completedCommitments / stats.commitments) * 100)
      : 0;

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: "📊 Weekly Recap", emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*✅ Completed*\n${stats.completed}/${stats.total} tasks (${completionRate}%)` },
          { type: "mrkdwn", text: `*🎯 Commitments*\n${stats.completedCommitments}/${stats.commitments} (${commitmentRate}%)` },
          { type: "mrkdwn", text: `*💪 Total*\n${stats.total} tasks` }
        ]
      }
    ];

    try {
      await sendToSlack(webhookUrl, { blocks, text: `Weekly Recap: ${stats.completed}/${stats.total} tasks` });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});
