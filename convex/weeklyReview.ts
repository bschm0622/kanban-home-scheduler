import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current week ID (Sunday of current week in YYYY-MM-DD format)
function getCurrentWeekId(): string {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = sunday.getDate() - day; // Days to subtract to get to Sunday
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Get day of week (0 = Sunday, 6 = Saturday)
function getDayOfWeek(): number {
  return new Date().getDay();
}

// Get weekly summary stats for review
export const getWeeklySummary = query({
  args: {
    weekId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all tasks for this week
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .collect();

    const completedTasks = weekTasks.filter(t => t.status === "completed");
    const commitmentTasks = weekTasks.filter(t => t.isCommitment && t.commitmentWeekId === args.weekId);
    const completedCommitments = commitmentTasks.filter(t => t.status === "completed");

    // Get week record for theme
    const weekRecord = await ctx.db
      .query("weeks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .first();

    return {
      totalTasks: weekTasks.length,
      completedTasks: completedTasks.length,
      completionRate: weekTasks.length > 0 ? Math.round((completedTasks.length / weekTasks.length) * 100) : 0,
      commitmentTasks: commitmentTasks.length,
      completedCommitments: completedCommitments.length,
      commitmentRate: commitmentTasks.length > 0 ? Math.round((completedCommitments.length / commitmentTasks.length) * 100) : 0,
      weekTheme: weekRecord?.weekTheme,
      completedTasksList: completedTasks.slice(0, 10), // First 10 for display
      pendingCommitments: commitmentTasks.filter(t => t.status !== "completed"),
    };
  },
});

// Check if user should see the weekly review modal
export const shouldShowWeeklyReview = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const currentWeekId = getCurrentWeekId();
    const dayOfWeek = getDayOfWeek();

    // Only show on Saturday (6) or Sunday (0)
    if (dayOfWeek !== 6 && dayOfWeek !== 0) {
      return false;
    }

    // Check if user already reviewed this week
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (settings?.lastWeekReviewWeekId === currentWeekId) {
      return false; // Already reviewed this week
    }

    return true;
  },
});

// Mark week as reviewed
export const markWeekReviewed = mutation({
  args: {
    weekId: v.string(),
    reflectionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Update or create user settings
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        lastWeekReviewWeekId: args.weekId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: identity.subject,
        lastWeekReviewWeekId: args.weekId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update week record with reflection if provided
    if (args.reflectionNote) {
      const weekRecord = await ctx.db
        .query("weeks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
        .first();

      if (weekRecord) {
        await ctx.db.patch(weekRecord._id, {
          reflectionNote: args.reflectionNote,
          reviewCompletedAt: Date.now(),
        });
      }
    }
  },
});

// Set commitments for the week
export const setWeekCommitments = mutation({
  args: {
    weekId: v.string(),
    taskIds: v.array(v.id("tasks")),
    weekTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Mark each task as a commitment
    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (task && task.userId === identity.subject) {
        await ctx.db.patch(taskId, {
          isCommitment: true,
          commitmentWeekId: args.weekId,
        });
      }
    }

    // Create or update week record
    const existingWeek = await ctx.db
      .query("weeks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .first();

    if (existingWeek) {
      await ctx.db.patch(existingWeek._id, {
        commitmentTaskIds: args.taskIds,
        weekTheme: args.weekTheme,
      });
    } else {
      // Calculate start and end dates
      const startDate = args.weekId;
      const endDate = new Date(new Date(args.weekId).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await ctx.db.insert("weeks", {
        weekId: args.weekId,
        startDate,
        endDate,
        isArchived: false,
        createdAt: Date.now(),
        userId: identity.subject,
        commitmentTaskIds: args.taskIds,
        weekTheme: args.weekTheme,
      });
    }

    return { success: true, commitmentCount: args.taskIds.length };
  },
});

// Get commitment tasks for a specific week
export const getWeekCommitments = query({
  args: {
    weekId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all commitment tasks for this week
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .collect();

    const commitmentTasks = allTasks.filter(t => t.isCommitment && t.commitmentWeekId === args.weekId);
    const completed = commitmentTasks.filter(t => t.status === "completed");

    // Get week theme
    const weekRecord = await ctx.db
      .query("weeks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .first();

    return {
      commitments: commitmentTasks,
      completedCount: completed.length,
      totalCount: commitmentTasks.length,
      weekTheme: weekRecord?.weekTheme,
    };
  },
});
