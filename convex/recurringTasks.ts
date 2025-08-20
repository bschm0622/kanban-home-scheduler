import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active recurring tasks
export const getRecurringTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db
      .query("recurringTasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Create a recurring task
export const createRecurringTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    frequency: v.union(v.literal("weekly"), v.literal("monthly")),
    preferredDay: v.optional(v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"), 
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db.insert("recurringTasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      frequency: args.frequency,
      preferredDay: args.preferredDay,
      isActive: true,
      createdAt: Date.now(),
      userId: identity.subject,
    });
  },
});

// Generate tasks from recurring tasks for the current week
export const generateRecurringTasks = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get current week ID
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const currentWeekId = monday.toISOString().split('T')[0];
    
    const recurringTasks = await ctx.db
      .query("recurringTasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const generatedTasks = [];
    
    for (const recurringTask of recurringTasks) {
      // Check if we already generated this recurring task for this week
      const existingTask = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", currentWeekId))
        .filter((q) => q.eq(q.field("recurringTaskId"), recurringTask._id))
        .first();
      
      if (!existingTask) {
        // Generate the task
        const taskId = await ctx.db.insert("tasks", {
          title: recurringTask.title,
          description: recurringTask.description,
          priority: recurringTask.priority,
          status: recurringTask.preferredDay || "backlog",
          weekId: recurringTask.preferredDay ? currentWeekId : undefined,
          recurringTaskId: recurringTask._id,
          createdAt: Date.now(),
          userId: identity.subject,
        });
        
        generatedTasks.push(taskId);
      }
    }
    
    return { generatedCount: generatedTasks.length };
  },
});

// Toggle recurring task active status
export const toggleRecurringTask = mutation({
  args: {
    taskId: v.id("recurringTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    return await ctx.db.patch(args.taskId, {
      isActive: !task.isActive,
    });
  },
});

// Delete recurring task
export const deleteRecurringTask = mutation({
  args: {
    taskId: v.id("recurringTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    return await ctx.db.delete(args.taskId);
  },
});