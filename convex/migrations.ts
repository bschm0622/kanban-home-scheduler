import { mutation } from "./_generated/server";

// Migration to add userId to existing tasks, recurring tasks, and weeks
// Run this once after deploying the new schema
export const addUserIdToExistingData = mutation({
  handler: async (ctx) => {
    // You'll need to replace this with a real user ID from Clerk
    // Get this from your Clerk dashboard or by signing up a user first
    const defaultUserId = "user_temp_migration_id"; // REPLACE THIS WITH REAL USER ID
    
    let updatedTasks = 0;
    let updatedRecurringTasks = 0;
    let updatedWeeks = 0;
    
    // Update tasks without userId
    const tasksWithoutUserId = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();
    
    for (const task of tasksWithoutUserId) {
      await ctx.db.patch(task._id, { userId: defaultUserId });
      updatedTasks++;
    }
    
    // Update recurring tasks without userId
    const recurringTasksWithoutUserId = await ctx.db
      .query("recurringTasks")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();
    
    for (const recurringTask of recurringTasksWithoutUserId) {
      await ctx.db.patch(recurringTask._id, { userId: defaultUserId });
      updatedRecurringTasks++;
    }
    
    // Update weeks without userId
    const weeksWithoutUserId = await ctx.db
      .query("weeks")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();
    
    for (const week of weeksWithoutUserId) {
      await ctx.db.patch(week._id, { userId: defaultUserId });
      updatedWeeks++;
    }
    
    return {
      updatedTasks,
      updatedRecurringTasks, 
      updatedWeeks,
      message: `Migration completed! Updated ${updatedTasks} tasks, ${updatedRecurringTasks} recurring tasks, and ${updatedWeeks} weeks.`
    };
  },
});

// Clean migration - just delete all existing data (use with caution!)
export const clearAllData = mutation({
  handler: async (ctx) => {
    // Delete all tasks
    const tasks = await ctx.db.query("tasks").collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }
    
    // Delete all recurring tasks
    const recurringTasks = await ctx.db.query("recurringTasks").collect();
    for (const recurringTask of recurringTasks) {
      await ctx.db.delete(recurringTask._id);
    }
    
    // Delete all weeks
    const weeks = await ctx.db.query("weeks").collect();
    for (const week of weeks) {
      await ctx.db.delete(week._id);
    }
    
    return { message: "All data cleared successfully!" };
  },
});