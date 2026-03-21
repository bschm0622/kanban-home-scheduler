import { mutation, internalMutation } from "./_generated/server";
import { getCurrentWeekIdEST } from "./lib/timezone";

// Auto-rollover any incomplete tasks from previous weeks (user-triggered, runs on app load)
export const autoRolloverPreviousWeeks = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await rolloverForUser(ctx, identity.subject);
  },
});

// Cron-based auto-rollover (Monday 3 AM EST) — runs for all users
export const cronAutoRollover = internalMutation({
  handler: async (ctx) => {
    // Get all distinct userIds that have tasks with weekIds
    const allTasks = await ctx.db.query("tasks")
      .filter((q) => q.neq(q.field("weekId"), undefined))
      .collect();

    const userIds = [...new Set(allTasks.map(t => t.userId))];
    let totalMoved = 0;

    for (const userId of userIds) {
      const result = await rolloverForUser(ctx, userId);
      totalMoved += result.movedTasksCount;
    }

    console.log(`Cron auto-rollover: moved ${totalMoved} tasks for ${userIds.length} users`);
    return { totalMoved, usersProcessed: userIds.length };
  },
});

// Shared rollover logic for a single user
async function rolloverForUser(ctx: any, userId: string) {
  const currentWeekId = getCurrentWeekIdEST();

  // Calculate next week ID
  const nextWeekSunday = new Date(currentWeekId);
  nextWeekSunday.setDate(nextWeekSunday.getDate() + 7);
  const nextWeekId = nextWeekSunday.toISOString().split('T')[0];

  // Find tasks from past weeks that are incomplete and not deleted
  const orphanedTasks = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) =>
      q.and(
        q.neq(q.field("weekId"), undefined),
        q.neq(q.field("weekId"), currentWeekId),
        q.neq(q.field("weekId"), nextWeekId),
        q.lt(q.field("weekId"), currentWeekId),
        q.neq(q.field("status"), "completed"),
        q.eq(q.field("deletedAt"), undefined)
      )
    )
    .collect();

  let movedCount = 0;
  for (const task of orphanedTasks) {
    // Cancel any stale reminders
    if (task.reminderJobId) {
      try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* ok */ }
    }
    await ctx.db.patch(task._id, {
      status: "backlog",
      weekId: undefined,
      reminderJobId: undefined,
      dueTime: undefined,
    });
    movedCount++;
  }

  // Create archived week records for past weeks with completed tasks
  const orphanedCompleted = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) =>
      q.and(
        q.neq(q.field("weekId"), undefined),
        q.neq(q.field("weekId"), currentWeekId),
        q.neq(q.field("weekId"), nextWeekId),
        q.lt(q.field("weekId"), currentWeekId),
        q.eq(q.field("status"), "completed")
      )
    )
    .collect();

  const weekIdList: string[] = orphanedCompleted.map((task: any) => task.weekId as string).filter(Boolean);
  const weekIds = [...new Set(weekIdList)];

  for (const weekId of weekIds) {
    const existingWeek = await ctx.db
      .query("weeks")
      .withIndex("by_user_and_week", (q: any) => q.eq("userId", userId).eq("weekId", weekId))
      .first();

    if (!existingWeek) {
      const endDate = new Date(new Date(weekId).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await ctx.db.insert("weeks", {
        weekId,
        startDate: weekId,
        endDate,
        isArchived: true,
        createdAt: Date.now(),
        userId,
      });
    }
  }

  return { movedTasksCount: movedCount, archivedWeeksCount: weekIds.length };
}
