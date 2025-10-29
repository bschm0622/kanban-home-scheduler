import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
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

    // Get streak data and commitment data
    const streakQuery = await ctx.runQuery(internal.slackNotifications.getStreakForUsers);
    const commitmentQuery = await ctx.runQuery(internal.slackNotifications.getCommitmentsForUsers, { weekId: currentWeekId });

    const message = formatEnhancedSlackMessage(tasks, dayName, streakQuery, commitmentQuery);

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
  },
});

// Get streak data for allowed users
export const getStreakForUsers = internalQuery({
  handler: async (ctx) => {
    const results = [];

    for (const userId of ALLOWED_USER_IDS) {
      // Get all completed tasks for this user
      const completedTasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", "completed"))
        .collect();

      // Extract completion dates
      const completionDates = completedTasks
        .filter(task => task.completedAt)
        .map(task => {
          const date = new Date(task.completedAt!);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        });

      // Calculate current streak (simplified from streaks.ts)
      const uniqueDates = [...new Set(completionDates)].sort().reverse();
      let currentStreak = 0;

      if (uniqueDates.length > 0) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        // Check if most recent completion was today or yesterday
        if (uniqueDates[0] === today || uniqueDates[0] === yesterdayStr) {
          currentStreak = 1;

          // Count consecutive days backwards
          for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i - 1]);
            const prevDate = new Date(uniqueDates[i]);
            const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      results.push({
        userId,
        currentStreak,
      });
    }

    return results;
  },
});

// Get commitment data for allowed users
export const getCommitmentsForUsers = internalQuery({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const commitmentTasks = allTasks.filter(t =>
      ALLOWED_USER_IDS.includes(t.userId) &&
      t.isCommitment &&
      t.commitmentWeekId === args.weekId
    );

    const completed = commitmentTasks.filter(t => t.status === "completed");
    return {
      total: commitmentTasks.length,
      completed: completed.length,
      tasks: commitmentTasks,
    };
  },
});

// Enhanced morning message format with streak and commitments
function formatEnhancedSlackMessage(tasks: any[], dayName: string, streaks: any[], commitments: any): any {
  const commitmentTasks = tasks.filter(t => t.isCommitment);
  const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const dayIcon = getDayIcon(dayName);

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${dayIcon} Good morning! Here's your ${formattedDay}`,
        emoji: true
      }
    }
  ];

  if (streaks.length > 0 && streaks[0].currentStreak > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔥 *${streaks[0].currentStreak} day streak* - keep it going!`
      }
    });
  }

  if (commitmentTasks.length > 0) {
    blocks.push({
      type: "divider"
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎯 Today's Commitments (${commitmentTasks.length})*\n${commitmentTasks.map(t => `📌 ${t.title} [${t.priority.toUpperCase()}]`).join('\n')}`
      }
    });
  }

  const otherTasks = tasks.filter(t => !t.isCommitment);
  if (otherTasks.length > 0) {
    blocks.push({
      type: "divider"
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 Other Tasks (${otherTasks.length})*\n${otherTasks.map(t => `• ${t.title} [${priorityEmoji(t.priority)}]`).join('\n')}`
      }
    });
  }

  blocks.push({
    type: "context",
    elements: [{
      type: "mrkdwn",
      text: `📊 Total: ${tasks.length} tasks | 🎯 Commitments: ${commitments.completed}/${commitments.total} this week`
    }]
  });

  return { blocks, text: `${formattedDay}'s Tasks: ${tasks.length} tasks` };
}

function getDayIcon(day: string): string {
  const icons: Record<string, string> = {
    monday: "💼", tuesday: "🚀", wednesday: "⚡", thursday: "💪",
    friday: "🎉", saturday: "🌞", sunday: "☀️",
  };
  return icons[day] || "📅";
}

function priorityEmoji(priority: string): string {
  return priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
}

// End of day summary
export const sendEndOfDaySummary = internalAction({
  handler: async (ctx) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { success: false, error: "SLACK_WEBHOOK_URL not configured" };

    const currentWeekId = getCurrentWeekId();
    const today = getCurrentDayName();
    const todayTasks: any[] = await ctx.runQuery(internal.slackNotifications.getTasksForDay, {
      weekId: currentWeekId,
      dayName: today,
    });

    const completed = todayTasks.filter(t => t.status === "completed");
    const remaining = todayTasks.filter(t => t.status !== "completed");
    const streaks = await ctx.runQuery(internal.slackNotifications.getStreakForUsers);
    const currentStreak = streaks[0]?.currentStreak || 0;

    const blocks: any[] = [
      {
        type: "header",
        text: { type: "plain_text", text: `🌙 ${today.charAt(0).toUpperCase() + today.slice(1)} Wrap-Up`, emoji: true }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `✅ *Completed: ${completed.length}/${todayTasks.length} tasks* (${Math.round((completed.length / todayTasks.length) * 100)}%)` }
      }
    ];

    if (remaining.length > 0) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `⏳ *Still open (${remaining.length}):*\n${remaining.map(t => `• ${t.title}${t.isCommitment ? ' [Commitment]' : ''}`).join('\n')}` }
      });
    }

    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `🔥 Streak: ${currentStreak} days ${completed.length > 0 ? '' : '(complete 1 task to keep it!)'}` }]
    });

    try {
      await sendToSlack(webhookUrl, { blocks, text: `${today} Wrap-Up` });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});

// Streak protection alert
export const sendStreakAlert = internalAction({
  handler: async (ctx) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { success: false };

    const streaks = await ctx.runQuery(internal.slackNotifications.getStreakForUsers);
    if (streaks.length === 0 || streaks[0].currentStreak === 0) return { success: true };

    const currentWeekId = getCurrentWeekId();
    const today = getCurrentDayName();
    const todayTasks: any[] = await ctx.runQuery(internal.slackNotifications.getTasksForDay, {
      weekId: currentWeekId,
      dayName: today,
    });

    const completedToday = todayTasks.filter(t => t.status === "completed");
    if (completedToday.length > 0) return { success: true };

    const currentStreak = streaks[0].currentStreak;
    const quickWins = todayTasks.filter(t => t.priority === "low").slice(0, 3);

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: "⚠️ Streak Alert! 🔥", emoji: true }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `You're on a *${currentStreak}-day streak*, but haven't completed any tasks today.` }
      }
    ];

    if (quickWins.length > 0) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Quick wins:*\n${quickWins.map(t => `• ${t.title}`).join('\n')}` }
      });
    }

    blocks.push({ type: "section", text: { type: "mrkdwn", text: "Don't break the chain! ⛓️" } });

    try {
      await sendToSlack(webhookUrl, { blocks, text: `Streak Alert: ${currentStreak} days` });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});

// Get week tasks for recap
export const getWeekTasksForRecap = internalQuery({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const weekTasks = allTasks.filter((t: any) => ALLOWED_USER_IDS.includes(t.userId) && t.weekId === args.weekId);
    const completed = weekTasks.filter((t: any) => t.status === "completed");
    const commitments = weekTasks.filter((t: any) => t.isCommitment);
    const completedCommitments = commitments.filter((t: any) => t.status === "completed");

    return {
      total: weekTasks.length,
      completed: completed.length,
      commitments: commitments.length,
      completedCommitments: completedCommitments.length,
    };
  },
});

// Weekly recap
export const sendWeeklyRecap = internalAction({
  handler: async (ctx) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { success: false };

    const currentWeekId = getCurrentWeekId();
    const stats = await ctx.runQuery(internal.slackNotifications.getWeekTasksForRecap, { weekId: currentWeekId });
    const streaks = await ctx.runQuery(internal.slackNotifications.getStreakForUsers);
    const currentStreak = streaks[0]?.currentStreak || 0;

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const commitmentRate = stats.commitments > 0 ? Math.round((stats.completedCommitments / stats.commitments) * 100) : 0;

    const blocks = [
      {
        type: "header",
        text: { type: "plain_text", text: "📊 Weekly Recap: Great work! 🎉", emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*✅ Completed*\n${stats.completed}/${stats.total} tasks (${completionRate}%)` },
          { type: "mrkdwn", text: `*🎯 Commitments*\n${stats.completedCommitments}/${stats.commitments} (${commitmentRate}%)` },
          { type: "mrkdwn", text: `*🔥 Streak*\n${currentStreak} days` },
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
