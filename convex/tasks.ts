import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current week ID (Sunday of current week in YYYY-MM-DD format)
function getCurrentWeekId(): string {
  const now = new Date();
  const sunday = new Date(now);
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = now.getDate() - day; // Days to subtract to get to Sunday
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Get week ID for any date (Sunday of that week in YYYY-MM-DD format)
function getWeekId(date: Date): string {
  const sunday = new Date(date);
  const day = date.getDay();
  const diff = date.getDate() - day;
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Get all tasks for the current week
export const getCurrentWeekTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const currentWeekId = getCurrentWeekId();
    
    // Get all tasks for current week + backlog for this user
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", currentWeekId))
      .collect();
    
    const backlogTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", identity.subject).eq("status", "backlog"))
      .collect();
    
    return {
      currentWeekId,
      weekTasks,
      backlogTasks,
    };
  },
});

// Get tasks for a specific week
export const getWeekTasks = query({
  args: {
    weekId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get all tasks for specified week + backlog for this user
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .collect();
    
    const backlogTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", identity.subject).eq("status", "backlog"))
      .collect();
    
    return {
      weekId: args.weekId,
      weekTasks,
      backlogTasks,
    };
  },
});

// Create a new task
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.optional(v.union(
      v.literal("backlog"),
      v.literal("sunday"),
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const currentWeekId = getCurrentWeekId();
    const status = args.status || "backlog";
    
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status,
      weekId: status !== "backlog" ? currentWeekId : undefined,
      createdAt: Date.now(),
      userId: identity.subject,
    });
  },
});

// Update task status (for drag and drop)
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("sunday"),
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Verify user owns this task
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    const currentWeekId = getCurrentWeekId();
    
    const updateData: any = {
      status: args.newStatus,
    };
    
    // Set weekId based on status
    if (args.newStatus === "backlog") {
      updateData.weekId = undefined;
    } else if (args.newStatus === "completed") {
      updateData.completedAt = Date.now();
      updateData.weekId = currentWeekId;
    } else {
      updateData.weekId = currentWeekId;
    }
    
    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Update task status to a specific week (for scheduling)
export const scheduleTaskToWeek = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("sunday"),
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("completed")
    ),
    weekId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Verify user owns this task
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    const updateData: any = {
      status: args.newStatus,
    };
    
    // Set weekId based on status and provided weekId
    if (args.newStatus === "backlog") {
      updateData.weekId = undefined;
    } else if (args.newStatus === "completed") {
      updateData.completedAt = Date.now();
      updateData.weekId = args.weekId || getCurrentWeekId();
    } else {
      updateData.weekId = args.weekId || getCurrentWeekId();
    }
    
    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Complete a task
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Verify user owns this task
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    const currentWeekId = getCurrentWeekId();
    
    return await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
      weekId: currentWeekId,
    });
  },
});

// Update task details (title, description, priority)
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Verify user owns this task
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.priority !== undefined) updateData.priority = args.priority;
    
    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Delete a task
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Verify user owns this task
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }
    
    return await ctx.db.delete(args.taskId);
  },
});

// Move incomplete tasks back to backlog (called at week end)
export const rolloverWeek = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const currentWeekId = getCurrentWeekId();
    
    // Find all incomplete tasks from current week for this user
    const incompleteTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", currentWeekId))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();
    
    // Move them back to backlog
    for (const task of incompleteTasks) {
      await ctx.db.patch(task._id, {
        status: "backlog",
        weekId: undefined,
      });
    }
    
    // Archive the week
    await ctx.db.insert("weeks", {
      weekId: currentWeekId,
      startDate: currentWeekId,
      endDate: new Date(new Date(currentWeekId).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isArchived: true,
      createdAt: Date.now(),
      userId: identity.subject,
    });
    
    return { movedTasks: incompleteTasks.length };
  },
});