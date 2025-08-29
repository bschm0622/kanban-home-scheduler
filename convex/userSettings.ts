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

// Get user settings (read-only)
export const getUserSettings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    return userSettings;
  },
});

// Create user settings (mutation)
export const createUserSettings = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    if (existing) {
      return existing;
    }
    
    const now = Date.now();
    const settingsId = await ctx.db.insert("userSettings", {
      userId: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
    
    return await ctx.db.get(settingsId);
  },
});

// Check if user needs to review backlog (new week since last review)
export const shouldShowBacklogReview = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    
    const currentWeekId = getCurrentWeekId();
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    // If no settings or no previous review, show review
    if (!userSettings || !userSettings.lastBacklogReviewWeekId) {
      return true;
    }
    
    // Show review if it's a new week
    return userSettings.lastBacklogReviewWeekId !== currentWeekId;
  },
});

// Mark backlog as reviewed for current week
export const markBacklogReviewed = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const currentWeekId = getCurrentWeekId();
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    
    if (userSettings) {
      // Update existing settings
      await ctx.db.patch(userSettings._id, {
        lastBacklogReviewWeekId: currentWeekId,
        updatedAt: Date.now(),
      });
    } else {
      // Create new settings
      const now = Date.now();
      await ctx.db.insert("userSettings", {
        userId: identity.subject,
        lastBacklogReviewWeekId: currentWeekId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});