import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Day status type
type DayStatus = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

// Allowed user IDs for Slack notifications (personal use only)
const ALLOWED_USER_IDS = [
  "user_31Y39ySFpvojwkAiCFGkVjLSXX3",
  "user_31YS0l3fGGQ9XK9XLRYFPIg8Puz"
];

// Get current day name in EST timezone (lowercase to match task status)
function getCurrentDayName(): DayStatus {
  const days: DayStatus[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  // Convert to EST timezone
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return days[estTime.getDay()];
}

// Get current week ID (Sunday of current week in YYYY-MM-DD format) in EST timezone
function getCurrentWeekId(): string {
  // Convert to EST timezone
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const sunday = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate());
  const day = estTime.getDay();
  const diff = sunday.getDate() - day;
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Internal query to get tasks for a specific day
export const getTasksForDay = internalQuery({
  args: {
    weekId: v.string(),
    dayName: v.union(
      v.literal("sunday"),
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday")
    ),
  },
  handler: async (ctx, args) => {
    // Get all tasks for the specified day
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week_and_status", (q) =>
        q.eq("weekId", args.weekId).eq("status", args.dayName)
      )
      .collect();

    // Filter to only allowed users
    return allTasks.filter(task => ALLOWED_USER_IDS.includes(task.userId));
  },
});

// Format tasks into Slack message blocks
function formatSlackMessage(tasks: any[], dayName: string): any {
  // Group tasks by priority
  const highPriority = tasks.filter(t => t.priority === "high");
  const mediumPriority = tasks.filter(t => t.priority === "medium");
  const lowPriority = tasks.filter(t => t.priority === "low");

  const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  // Build message blocks
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 ${formattedDay}'s Tasks`,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Total: ${tasks.length} tasks* | 🔴 High: ${highPriority.length} | 🟡 Medium: ${mediumPriority.length} | 🟢 Low: ${lowPriority.length}`
      }
    },
    {
      type: "divider"
    }
  ];

  // Add tasks grouped by priority
  if (highPriority.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🔴 High Priority*\n${highPriority.map(t => `• ${t.title}${t.description ? `\n  _${t.description}_` : ''}`).join('\n')}`
      }
    });
  }

  if (mediumPriority.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🟡 Medium Priority*\n${mediumPriority.map(t => `• ${t.title}${t.description ? `\n  _${t.description}_` : ''}`).join('\n')}`
      }
    });
  }

  if (lowPriority.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🟢 Low Priority*\n${lowPriority.map(t => `• ${t.title}${t.description ? `\n  _${t.description}_` : ''}`).join('\n')}`
      }
    });
  }

  if (tasks.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎉 No tasks scheduled for today! Enjoy your day!"
      }
    });
  }

  return {
    blocks,
    text: `${formattedDay}'s Tasks: ${tasks.length} tasks` // Fallback text
  };
}

// Send message to Slack webhook
async function sendToSlack(webhookUrl: string, message: any): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${errorText}`);
  }
}

// Internal action called by cron job - sends daily tasks to Slack
export const sendScheduledDailyTasks = internalAction({
  args: {
    dayName: v.optional(v.union(
      v.literal("sunday"),
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday")
    )),
  },
  handler: async (ctx, args) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("SLACK_WEBHOOK_URL not configured, skipping daily notification");
      return { success: false, error: "SLACK_WEBHOOK_URL not configured" };
    }

    const currentWeekId = getCurrentWeekId();
    const dayName = args.dayName || getCurrentDayName();

    // Get tasks for the day
    const tasks: any[] = await ctx.runQuery(internal.slackNotifications.getTasksForDay, {
      weekId: currentWeekId,
      dayName: dayName,
    });

    if (tasks.length > 0) {
      const message = formatSlackMessage(tasks, dayName);

      try {
        await sendToSlack(webhookUrl, message);
        console.log(`Sent daily tasks notification: ${tasks.length} tasks for ${dayName}`);
        return {
          success: true,
          taskCount: tasks.length,
          day: dayName
        };
      } catch (error) {
        console.error("Failed to send scheduled Slack notification:", error);
        return { success: false, error: String(error) };
      }
    } else {
      console.log(`No tasks scheduled for ${dayName}, skipping notification`);
      return { success: true, taskCount: 0, day: dayName };
    }
  },
});

// Scheduled cron job - runs daily at 7:00 AM EST
export const crons = cronJobs();

crons.daily(
  "send daily tasks to slack",
  { hourUTC: 11, minuteUTC: 0 }, // 7:00 AM EST (UTC-4) = 11:00 UTC
  internal.slackNotifications.sendScheduledDailyTasks,
  {} // args - runs with current day
);
