import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Calculate days between two dates
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Get user's current streak data
export const getStreak = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    // Return default if no streak exists yet
    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: null,
        streakStartDate: null,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletionDate: streak.lastCompletionDate,
      streakStartDate: streak.streakStartDate,
    };
  },
});

// Update streak when a task is completed (internal - called by tasks.ts)
export const updateStreak = internalMutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // Get existing streak record
    const existingStreak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    // If no streak record exists, create initial one
    if (!existingStreak) {
      const newStreak = await ctx.db.insert("streaks", {
        userId: identity.subject,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: today,
        streakStartDate: today,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        currentStreak: 1,
        longestStreak: 1,
        isMilestone: true,
        milestoneDay: 1,
      };
    }

    // If already completed a task today, don't update streak
    if (existingStreak.lastCompletionDate === today) {
      return {
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        isMilestone: false,
        milestoneDay: null,
      };
    }

    let newStreak = existingStreak.currentStreak;
    let newStreakStartDate = existingStreak.streakStartDate;

    // If last completion was yesterday, increment streak
    if (existingStreak.lastCompletionDate === yesterday) {
      newStreak = existingStreak.currentStreak + 1;
    }
    // If last completion was 2+ days ago, reset streak
    else if (daysBetween(existingStreak.lastCompletionDate, today) > 1) {
      newStreak = 1;
      newStreakStartDate = today;
    }

    // Update longest streak if current streak is longer
    const newLongestStreak = Math.max(newStreak, existingStreak.longestStreak);

    // Check if this is a milestone (7, 14, 30, 60, 100, etc.)
    const milestones = [7, 14, 30, 60, 100, 200, 365];
    const isMilestone = milestones.includes(newStreak);

    // Update the streak record
    await ctx.db.patch(existingStreak._id, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastCompletionDate: today,
      streakStartDate: newStreakStartDate,
      updatedAt: Date.now(),
    });

    return {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      isMilestone,
      milestoneDay: isMilestone ? newStreak : null,
      previousStreak: existingStreak.currentStreak,
    };
  },
});

// Check if user has completed a task today (for streak protection)
export const hasCompletedTaskToday = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const today = getTodayDate();

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return {
      hasCompleted: streak?.lastCompletionDate === today,
      currentStreak: streak?.currentStreak || 0,
    };
  },
});
