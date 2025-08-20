import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current week ID (Monday of current week in YYYY-MM-DD format)
function getCurrentWeekId(): string {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

// Get all tasks for the current week
export const getCurrentWeekTasks = query({
  handler: async (ctx) => {
    const currentWeekId = getCurrentWeekId();
    
    // Get all tasks for current week + backlog
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week_and_status", (q) => q.eq("weekId", currentWeekId))
      .collect();
    
    const backlogTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "backlog"))
      .collect();
    
    return {
      currentWeekId,
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
    const currentWeekId = getCurrentWeekId();
    const status = args.status || "backlog";
    
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status,
      weekId: status !== "backlog" ? currentWeekId : undefined,
      createdAt: Date.now(),
    });
  },
});

// Update task status (for drag and drop)
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("monday"),
      v.literal("tuesday"), 
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
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

// Complete a task
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const currentWeekId = getCurrentWeekId();
    
    return await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
      weekId: currentWeekId,
    });
  },
});

// Delete a task
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.taskId);
  },
});

// Move incomplete tasks back to backlog (called at week end)
export const rolloverWeek = mutation({
  handler: async (ctx) => {
    const currentWeekId = getCurrentWeekId();
    
    // Find all incomplete tasks from current week
    const incompleteTasks = await ctx.db
      .query("tasks")
      .withIndex("by_week", (q) => q.eq("weekId", currentWeekId))
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
    });
    
    return { movedTasks: incompleteTasks.length };
  },
});