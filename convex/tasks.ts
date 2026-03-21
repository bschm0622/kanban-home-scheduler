import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentWeekIdEST, getESTTimestamp, type DayStatus } from "./lib/timezone";

const DAY_STATUSES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function isDayStatus(s: string): s is DayStatus {
  return (DAY_STATUSES as readonly string[]).includes(s);
}

// Helper: schedule or cancel a task reminder based on dueTime
async function handleReminder(
  ctx: any,
  taskId: any,
  task: { reminderJobId?: any; dueTime?: string; status: string; weekId?: string },
  newDueTime?: string | null,
  newStatus?: string,
  newWeekId?: string,
) {
  const status = newStatus ?? task.status;
  const weekId = newWeekId ?? task.weekId;
  const dueTime = newDueTime === undefined ? task.dueTime : (newDueTime ?? undefined);

  // Cancel existing reminder if any
  if (task.reminderJobId) {
    try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* already ran or cancelled */ }
  }

  // Schedule new reminder if applicable
  if (dueTime && weekId && isDayStatus(status)) {
    const timestamp = getESTTimestamp(weekId, status as DayStatus, dueTime);
    if (timestamp > Date.now()) {
      const jobId = await ctx.scheduler.runAt(
        timestamp,
        internal.slackNotifications.sendTaskReminder,
        { taskId }
      );
      return { reminderJobId: jobId, dueTime };
    }
  }

  return { reminderJobId: undefined, dueTime };
}

// Soft-delete filter helper
function notDeleted(task: any): boolean {
  return !task.deletedAt;
}

// Get all tasks for the current week
export const getCurrentWeekTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentWeekId = getCurrentWeekIdEST();

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
      weekTasks: weekTasks.filter(notDeleted),
      backlogTasks: backlogTasks.filter(notDeleted),
    };
  },
});

// Get tasks for a specific week
export const getWeekTasks = query({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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
      weekTasks: weekTasks.filter(notDeleted),
      backlogTasks: backlogTasks.filter(notDeleted),
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
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday")
    )),
    dueTime: v.optional(v.string()),
    weekId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentWeekId = getCurrentWeekIdEST();
    const status = args.status || "backlog";
    const weekId = status !== "backlog" ? (args.weekId || currentWeekId) : undefined;

    const taskData: any = {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status,
      weekId,
      createdAt: Date.now(),
      userId: identity.subject,
    };

    if (args.dueTime) {
      taskData.dueTime = args.dueTime;
    }

    const taskId = await ctx.db.insert("tasks", taskData);

    // Schedule reminder if dueTime is set and task is on a day
    if (args.dueTime && weekId && isDayStatus(status)) {
      const timestamp = getESTTimestamp(weekId, status as DayStatus, args.dueTime);
      if (timestamp > Date.now()) {
        const jobId = await ctx.scheduler.runAt(
          timestamp,
          internal.slackNotifications.sendTaskReminder,
          { taskId }
        );
        await ctx.db.patch(taskId, { reminderJobId: jobId });
      }
    }

    return taskId;
  },
});

// Update task status (for drag and drop / scheduling)
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday"), v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    const currentWeekId = getCurrentWeekIdEST();
    const updateData: any = { status: args.newStatus };

    if (args.newStatus === "backlog") {
      updateData.weekId = undefined;
    } else if (args.newStatus === "completed") {
      updateData.completedAt = Date.now();
      updateData.weekId = task.weekId || currentWeekId;
    } else {
      updateData.weekId = task.weekId || currentWeekId;
    }

    // Handle reminder: cancel if completing/backlogging, reschedule if moving to different day
    const reminderUpdate = await handleReminder(
      ctx, args.taskId, task, undefined, args.newStatus, updateData.weekId
    );
    updateData.reminderJobId = reminderUpdate.reminderJobId;

    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Schedule task to a specific week/day
export const scheduleTaskToWeek = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("sunday"), v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"), v.literal("friday"),
      v.literal("saturday"), v.literal("completed")
    ),
    weekId: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    const updateData: any = { status: args.newStatus };

    if (args.newStatus === "backlog") {
      updateData.weekId = undefined;
    } else if (args.newStatus === "completed") {
      updateData.completedAt = Date.now();
      updateData.weekId = args.weekId || getCurrentWeekIdEST();
    } else {
      updateData.weekId = args.weekId || getCurrentWeekIdEST();
    }

    // Handle dueTime update
    const newDueTime = args.dueTime !== undefined ? args.dueTime : undefined;
    const reminderUpdate = await handleReminder(
      ctx, args.taskId, task, newDueTime !== undefined ? newDueTime : undefined,
      args.newStatus, updateData.weekId
    );
    updateData.reminderJobId = reminderUpdate.reminderJobId;
    if (args.dueTime !== undefined) {
      updateData.dueTime = args.dueTime || undefined;
    }

    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Complete a task
export const completeTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    // Cancel any pending reminder
    if (task.reminderJobId) {
      try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* ok */ }
    }

    await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
      weekId: task.weekId || getCurrentWeekIdEST(),
      reminderJobId: undefined,
    });

    return { taskId: args.taskId };
  },
});

// Update task details
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
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

    // Handle dueTime change — empty string means clear
    if (args.dueTime !== undefined) {
      const reminderUpdate = await handleReminder(
        ctx, args.taskId, task, args.dueTime || null
      );
      updateData.dueTime = args.dueTime || undefined;
      updateData.reminderJobId = reminderUpdate.reminderJobId;
      // If clearing dueTime, explicitly remove it
      if (!args.dueTime) {
        updateData.dueTime = undefined;
      }
    }

    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Soft delete a task
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    // Cancel any pending reminder
    if (task.reminderJobId) {
      try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* ok */ }
    }

    return await ctx.db.patch(args.taskId, {
      deletedAt: Date.now(),
      reminderJobId: undefined,
    });
  },
});

// Restore a soft-deleted task (for undo)
export const restoreTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) throw new Error("Task not found or access denied");

    const updateData: any = { deletedAt: undefined };

    // Re-schedule reminder if task has a dueTime and is on a day
    if (task.dueTime && task.weekId && isDayStatus(task.status)) {
      const timestamp = getESTTimestamp(task.weekId, task.status as DayStatus, task.dueTime);
      if (timestamp > Date.now()) {
        const jobId = await ctx.scheduler.runAt(
          timestamp,
          internal.slackNotifications.sendTaskReminder,
          { taskId: args.taskId }
        );
        updateData.reminderJobId = jobId;
      }
    }

    return await ctx.db.patch(args.taskId, updateData);
  },
});

// Permanently delete tasks soft-deleted more than 24 hours ago (cron job)
export const permanentlyDeleteOldTasks = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    // Query all tasks — filter for deletedAt < cutoff
    // This is a cleanup job so full scan is acceptable
    const allTasks = await ctx.db.query("tasks").collect();
    const toDelete = allTasks.filter(t => t.deletedAt && t.deletedAt < cutoff);

    for (const task of toDelete) {
      await ctx.db.delete(task._id);
    }

    if (toDelete.length > 0) {
      console.log(`Permanently deleted ${toDelete.length} tasks`);
    }
    return { deleted: toDelete.length };
  },
});

// Move incomplete tasks back to backlog (user-triggered)
export const rolloverWeek = mutation({
  args: { weekId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const targetWeekId = args.weekId || getCurrentWeekIdEST();

    const incompleteTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", targetWeekId))
      .filter((q) => q.and(
        q.neq(q.field("status"), "completed"),
        q.eq(q.field("deletedAt"), undefined)
      ))
      .collect();

    for (const task of incompleteTasks) {
      // Cancel any reminders
      if (task.reminderJobId) {
        try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* ok */ }
      }
      await ctx.db.patch(task._id, {
        status: "backlog",
        weekId: undefined,
        reminderJobId: undefined,
        dueTime: undefined,
      });
    }

    return { movedTasks: incompleteTasks.length };
  },
});

// Manual reset for a specific week
export const resetWeek = mutation({
  args: { weekId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const incompleteTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_week", (q) => q.eq("userId", identity.subject).eq("weekId", args.weekId))
      .filter((q) => q.and(
        q.neq(q.field("status"), "completed"),
        q.eq(q.field("deletedAt"), undefined)
      ))
      .collect();

    for (const task of incompleteTasks) {
      if (task.reminderJobId) {
        try { await ctx.scheduler.cancel(task.reminderJobId); } catch { /* ok */ }
      }
      await ctx.db.patch(task._id, {
        status: "backlog",
        weekId: undefined,
        reminderJobId: undefined,
        dueTime: undefined,
      });
    }

    return { movedTasks: incompleteTasks.length };
  },
});

// Get the oldest backlog tasks for weekly review
export const getOldestBacklogTasks = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const oldestTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", identity.subject).eq("status", "backlog"))
      .order("asc")
      .take(10);

    return oldestTasks.filter(notDeleted).slice(0, 5);
  },
});
