// Streak system has been removed. These stubs exist to prevent import errors
// during the transition period. They can be fully deleted once all frontend
// references are cleaned up.

import { query } from "./_generated/server";

export const getStreak = query({
  handler: async () => {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: null,
      streakStartDate: null,
    };
  },
});

export const hasCompletedTaskToday = query({
  handler: async () => {
    return { hasCompleted: false, currentStreak: 0 };
  },
});
