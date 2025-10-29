import { query } from "./_generated/server";

// Get today's date in YYYY-MM-DD format (local timezone)
function getTodayDateLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get date in YYYY-MM-DD format from timestamp (local timezone)
function getDateFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate streak from completion dates
function calculateStreak(completionDates: string[]): {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  streakStartDate: string | null;
} {
  if (completionDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: null,
      streakStartDate: null,
    };
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...new Set(completionDates)].sort().reverse();

  const today = getTodayDateLocal();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDateFromTimestamp(yesterday.getTime());

  // Calculate current streak
  let currentStreak = 0;
  let streakStartDate: string | null = null;

  // Check if most recent completion was today or yesterday
  if (sortedDates[0] === today || sortedDates[0] === yesterdayStr) {
    currentStreak = 1;
    streakStartDate = sortedDates[0];

    // Count consecutive days backwards
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i - 1]);
      const prevDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        streakStartDate = sortedDates[i];
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = currentStreak;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i - 1]);
    const prevDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastCompletionDate: sortedDates[0],
    streakStartDate,
  };
}

// Get user's current streak data
export const getStreak = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all completed tasks for this user
    const completedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", identity.subject).eq("status", "completed"))
      .collect();

    // Extract completion dates
    const completionDates = completedTasks
      .filter(task => task.completedAt)
      .map(task => getDateFromTimestamp(task.completedAt!));

    return calculateStreak(completionDates);
  },
});

// Check if user has completed a task today (for streak protection)
export const hasCompletedTaskToday = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const today = getTodayDateLocal();

    // Get completed tasks from today
    const completedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", identity.subject).eq("status", "completed"))
      .collect();

    const todayCompletions = completedTasks.filter(
      task => task.completedAt && getDateFromTimestamp(task.completedAt) === today
    );

    // Get streak data
    const completionDates = completedTasks
      .filter(task => task.completedAt)
      .map(task => getDateFromTimestamp(task.completedAt!));

    const { currentStreak } = calculateStreak(completionDates);

    return {
      hasCompleted: todayCompletions.length > 0,
      currentStreak,
    };
  },
});
