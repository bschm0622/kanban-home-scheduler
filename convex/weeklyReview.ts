import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentWeekIdEST, getESTDate } from "./lib/timezone";

// Check if user should see the weekly review modal
export const shouldShowWeeklyReview = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const currentWeekId = getCurrentWeekIdEST();
    const dayOfWeek = getESTDate().getDay();

    // Only show on Saturday (6) or Sunday (0)
    if (dayOfWeek !== 6 && dayOfWeek !== 0) {
      return false;
    }

    // Check if user already reviewed this week
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (settings?.lastWeekReviewWeekId === currentWeekId) {
      return false; // Already reviewed this week
    }

    return true;
  },
});

// Mark week as reviewed
export const markWeekReviewed = mutation({
  args: {
    weekId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Update or create user settings
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        lastWeekReviewWeekId: args.weekId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: identity.subject,
        lastWeekReviewWeekId: args.weekId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
