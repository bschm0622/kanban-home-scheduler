import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all recurring tasks
export const getRecurringTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db
      .query("recurringTasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
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

// Generate tasks from selected recurring tasks for the current week
export const generateRecurringTasks = mutation({
  args: {
    taskIds: v.array(v.id("recurringTasks")),
  },
  handler: async (ctx, args) => {
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
    
    const generatedTasks = [];
    
    // Process only the selected recurring tasks
    for (const taskId of args.taskIds) {
      const recurringTask = await ctx.db.get(taskId);
      
      // Verify ownership and existence
      if (!recurringTask || recurringTask.userId !== identity.subject) {
        continue; // Skip if not found or not owned
      }
      
      // Check if we already generated this recurring task for this week
      const existingTask = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", currentWeekId))
        .filter((q) => q.eq(q.field("recurringTaskId"), recurringTask._id))
        .first();
      
      if (!existingTask) {
        // Generate the task
        const newTaskId = await ctx.db.insert("tasks", {
          title: recurringTask.title,
          description: recurringTask.description,
          priority: recurringTask.priority,
          status: recurringTask.preferredDay || "backlog",
          weekId: recurringTask.preferredDay ? currentWeekId : undefined,
          recurringTaskId: recurringTask._id,
          createdAt: Date.now(),
          userId: identity.subject,
        });
        
        generatedTasks.push(newTaskId);
      }
    }
    
    return { generatedCount: generatedTasks.length };
  },
});

// Check which recurring tasks already have generated tasks for this week
export const checkExistingTasks = mutation({
  args: {
    taskIds: v.array(v.id("recurringTasks")),
  },
  handler: async (ctx, args) => {
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
    
    const availableTasks = [];
    
    for (const taskId of args.taskIds) {
      const recurringTask = await ctx.db.get(taskId);
      
      // Verify ownership and existence
      if (!recurringTask || recurringTask.userId !== identity.subject) {
        continue;
      }
      
      // Check if we already generated this recurring task for this week
      const existingTask = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", currentWeekId))
        .filter((q) => q.eq(q.field("recurringTaskId"), recurringTask._id))
        .first();
      
      if (!existingTask) {
        availableTasks.push(taskId);
      }
    }
    
    return { availableTaskIds: availableTasks };
  },
});

// Update recurring task details
export const updateRecurringTask = mutation({
  args: {
    taskId: v.id("recurringTasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
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
    
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.priority !== undefined) updateData.priority = args.priority;
    // Always update preferredDay if it's provided (even if undefined to clear it)
    if (args.hasOwnProperty('preferredDay')) updateData.preferredDay = args.preferredDay;
    
    return await ctx.db.patch(args.taskId, updateData);
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