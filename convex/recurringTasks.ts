import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentWeekIdEST } from "./lib/timezone";

// Get all recurring tasks
export const getRecurringTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday")
    )),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const data: any = {
      title: args.title,
      description: args.description,
      priority: args.priority,
      frequency: args.frequency,
      preferredDay: args.preferredDay,
      isActive: true,
      createdAt: Date.now(),
      userId: identity.subject,
    };
    if (args.dueTime) data.dueTime = args.dueTime;

    return await ctx.db.insert("recurringTasks", data);
  },
});

// Generate tasks from selected recurring tasks for a specific week
export const generateRecurringTasks = mutation({
  args: {
    taskIds: v.array(v.id("recurringTasks")),
    weekId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetWeekId = args.weekId || getCurrentWeekIdEST();
    const generatedTasks = [];

    for (const taskId of args.taskIds) {
      const recurringTask = await ctx.db.get(taskId);
      if (!recurringTask || recurringTask.userId !== identity.subject) continue;

      const existingTask = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", targetWeekId))
        .filter((q) => q.eq(q.field("recurringTaskId"), recurringTask._id))
        .first();

      if (!existingTask) {
        const taskData: any = {
          title: recurringTask.title,
          description: recurringTask.description,
          priority: recurringTask.priority,
          status: recurringTask.preferredDay || "backlog",
          weekId: recurringTask.preferredDay ? targetWeekId : undefined,
          recurringTaskId: recurringTask._id,
          createdAt: Date.now(),
          userId: identity.subject,
        };
        if (recurringTask.dueTime && recurringTask.preferredDay) {
          taskData.dueTime = recurringTask.dueTime;
        }
        const newTaskId = await ctx.db.insert("tasks", taskData);
        generatedTasks.push(newTaskId);
      }
    }

    return { generatedCount: generatedTasks.length };
  },
});

// Auto-generate recurring tasks for all users (Monday 4 AM EST cron)
export const autoGenerateRecurringTasks = internalMutation({
  handler: async (ctx) => {
    const currentWeekId = getCurrentWeekIdEST();

    // Get all active recurring tasks
    const allRecurring = await ctx.db.query("recurringTasks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let generatedCount = 0;

    for (const recurring of allRecurring) {
      // For weekly tasks: always generate
      // For monthly tasks: only generate on the first week of the month
      if (recurring.frequency === "monthly") {
        const weekStart = new Date(currentWeekId);
        if (weekStart.getDate() > 7) continue; // Only first week of month
      }

      // Check if already generated for this week
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_user_and_week", (q) =>
          q.eq("userId", recurring.userId).eq("weekId", currentWeekId)
        )
        .filter((q) => q.eq(q.field("recurringTaskId"), recurring._id))
        .first();

      if (!existing) {
        const taskData: any = {
          title: recurring.title,
          description: recurring.description,
          priority: recurring.priority,
          status: recurring.preferredDay || "backlog",
          weekId: recurring.preferredDay ? currentWeekId : undefined,
          recurringTaskId: recurring._id,
          createdAt: Date.now(),
          userId: recurring.userId,
        };
        if (recurring.dueTime && recurring.preferredDay) {
          taskData.dueTime = recurring.dueTime;
        }
        await ctx.db.insert("tasks", taskData);
        generatedCount++;
      }
    }

    console.log(`Auto-generated ${generatedCount} recurring tasks for week ${currentWeekId}`);
    return { generatedCount, weekId: currentWeekId };
  },
});

// Check which recurring tasks already have generated tasks for this week
export const checkExistingTasks = mutation({
  args: { taskIds: v.array(v.id("recurringTasks")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentWeekId = getCurrentWeekIdEST();
    const availableTasks = [];

    for (const taskId of args.taskIds) {
      const recurringTask = await ctx.db.get(taskId);
      if (!recurringTask || recurringTask.userId !== identity.subject) continue;

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
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday")
    )),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.priority !== undefined) updateData.priority = args.priority;
    if (args.hasOwnProperty('preferredDay')) updateData.preferredDay = args.preferredDay;
    if (args.dueTime !== undefined) updateData.dueTime = args.dueTime || undefined;

    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Toggle recurring task active status
export const toggleRecurringTask = mutation({
  args: { taskId: v.id("recurringTasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    return await ctx.db.patch(args.taskId, { isActive: !task.isActive });
  },
});

// Delete recurring task
export const deleteRecurringTask = mutation({
  args: { taskId: v.id("recurringTasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    return await ctx.db.delete(args.taskId);
  },
});
