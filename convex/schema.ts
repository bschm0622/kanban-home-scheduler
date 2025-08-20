import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
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
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    weekId: v.optional(v.string()), // Format: YYYY-MM-DD (Monday of the week)
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    recurringTaskId: v.optional(v.id("recurringTasks")),
  })
    .index("by_status", ["status"])
    .index("by_week", ["weekId"])
    .index("by_week_and_status", ["weekId", "status"]),

  recurringTasks: defineTable({
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
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  weeks: defineTable({
    weekId: v.string(), // Format: YYYY-MM-DD (Monday of the week)
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
    isArchived: v.boolean(),
    createdAt: v.number(),
  }).index("by_week_id", ["weekId"]),
});