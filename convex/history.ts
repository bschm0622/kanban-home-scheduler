import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all archived weeks with their completed tasks
export const getArchivedWeeks = query({
  handler: async (ctx) => {
    const archivedWeeks = await ctx.db
      .query("weeks")
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .take(20); // Limit to last 20 weeks

    const weeksWithTasks = await Promise.all(
      archivedWeeks.map(async (week) => {
        const completedTasks = await ctx.db
          .query("tasks")
          .withIndex("by_week", (q) => q.eq("weekId", week.weekId))
          .filter((q) => q.eq(q.field("status"), "completed"))
          .collect();

        return {
          ...week,
          completedTasks,
          completedCount: completedTasks.length,
        };
      })
    );

    return weeksWithTasks;
  },
});

// Get detailed view of a specific week
export const getWeekHistory = query({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const week = await ctx.db
      .query("weeks")
      .withIndex("by_week_id", (q) => q.eq("weekId", args.weekId))
      .first();

    if (!week) return null;

    const completedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    return {
      ...week,
      completedTasks,
    };
  },
});

// Get completion stats for the last few weeks
export const getCompletionStats = query({
  handler: async (ctx) => {
    const recentWeeks = await ctx.db
      .query("weeks")
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .take(8);

    const statsPromises = recentWeeks.map(async (week) => {
      const completedTasks = await ctx.db
        .query("tasks")
        .withIndex("by_week", (q) => q.eq("weekId", week.weekId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      // Get all tasks that were assigned to this week (completed + moved to backlog)
      const allWeekTasks = await ctx.db
        .query("tasks")
        .withIndex("by_week", (q) => q.eq("weekId", week.weekId))
        .collect();

      return {
        weekId: week.weekId,
        startDate: week.startDate,
        completedCount: completedTasks.length,
        totalCount: allWeekTasks.length,
        completionRate: allWeekTasks.length > 0 ? 
          Math.round((completedTasks.length / allWeekTasks.length) * 100) : 0,
      };
    });

    return await Promise.all(statsPromises);
  },
});