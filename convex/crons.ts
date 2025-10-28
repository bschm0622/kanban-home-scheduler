import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Morning notification - 9:00 AM EST
crons.daily(
  "send daily tasks to slack",
  { hourUTC: 14, minuteUTC: 0 }, // 9:00 AM EST = 14:00 UTC
  internal.slackNotifications.sendScheduledDailyTasks,
  {}
);

// End of day summary - 8:00 PM EST
crons.daily(
  "end of day summary",
  { hourUTC: 1, minuteUTC: 0 }, // 8:00 PM EST = 01:00 UTC next day
  internal.slackNotifications.sendEndOfDaySummary,
  {}
);

// Streak protection alert - 7:00 PM EST
crons.daily(
  "streak protection alert",
  { hourUTC: 0, minuteUTC: 0 }, // 7:00 PM EST = 00:00 UTC next day
  internal.slackNotifications.sendStreakAlert,
  {}
);

// Weekly recap - Sunday 9:00 PM EST
crons.weekly(
  "weekly recap",
  { hourUTC: 2, minuteUTC: 0, dayOfWeek: "sunday" }, // Sunday 9:00 PM EST = Monday 02:00 UTC
  internal.slackNotifications.sendWeeklyRecap,
  {}
);

export default crons;
