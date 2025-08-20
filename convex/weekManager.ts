import { mutation } from "./_generated/server";

// Get current week ID (Monday of current week in YYYY-MM-DD format)
function getCurrentWeekId(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

// Auto-rollover any incomplete tasks from previous weeks
export const autoRolloverPreviousWeeks = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const currentWeekId = getCurrentWeekId();
    
    // Find all tasks for this user that have a weekId but it's not the current week and not completed
    const orphanedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => 
        q.and(
          q.neq(q.field("weekId"), undefined),
          q.neq(q.field("weekId"), currentWeekId),
          q.neq(q.field("status"), "completed")
        )
      )
      .collect();
    
    // Move them back to backlog
    let movedCount = 0;
    for (const task of orphanedTasks) {
      await ctx.db.patch(task._id, {
        status: "backlog",
        weekId: undefined,
      });
      movedCount++;
    }
    
    // Also check if we need to create a week record for any orphaned completed tasks
    const orphanedCompletedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => 
        q.and(
          q.neq(q.field("weekId"), undefined),
          q.neq(q.field("weekId"), currentWeekId),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();
    
    // Group completed tasks by their weekId and create week records
    const weekIds = new Set(orphanedCompletedTasks.map(task => task.weekId));
    
    for (const weekId of weekIds) {
      if (!weekId) continue;
      
      // Check if week record already exists for this user
      const existingWeek = await ctx.db
        .query("weeks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", weekId))
        .first();
      
      if (!existingWeek) {
        // Create week record
        const startDate = weekId;
        const endDate = new Date(new Date(weekId).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        await ctx.db.insert("weeks", {
          weekId,
          startDate,
          endDate,
          isArchived: true,
          createdAt: Date.now(),
          userId: identity.subject,
        });
      }
    }
    
    return { 
      movedTasksCount: movedCount,
      archivedWeeksCount: weekIds.size
    };
  },
});