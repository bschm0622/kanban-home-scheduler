import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Morning briefing - disabled
// crons.daily(
//   "morning briefing",
//   { hourUTC: 14, minuteUTC: 0 },
//   internal.slackNotifications.sendScheduledDailyTasks,
//   {}
// );

// Weekly recap - disabled
// crons.weekly(
//   "weekly recap",
//   { hourUTC: 2, minuteUTC: 0, dayOfWeek: "sunday" },
//   internal.slackNotifications.sendWeeklyRecap,
//   {}
// );

// Auto-rollover - Monday 3:00 AM EST (Monday 08:00 UTC)
// Moves incomplete tasks from past weeks to backlog
crons.weekly(
  "auto rollover",
  { hourUTC: 8, minuteUTC: 0, dayOfWeek: "monday" },
  internal.weekManager.cronAutoRollover,
  {}
);

// Auto-generate recurring tasks - Monday 4:00 AM EST (Monday 09:00 UTC)
// Creates task instances from active recurring task templates
crons.weekly(
  "auto generate recurring tasks",
  { hourUTC: 9, minuteUTC: 0, dayOfWeek: "monday" },
  internal.recurringTasks.autoGenerateRecurringTasks,
  {}
);

// Permanently delete soft-deleted tasks older than 24h - daily 3:00 AM EST (08:00 UTC)
crons.daily(
  "cleanup deleted tasks",
  { hourUTC: 8, minuteUTC: 0 },
  internal.tasks.permanentlyDeleteOldTasks,
  {}
);

export default crons;
