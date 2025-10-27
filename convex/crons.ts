import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "send daily tasks to slack",
  { hourUTC: 13, minuteUTC: 0 }, // 9:00 AM EDT = 13:00 UTC
  internal.slackNotifications.sendScheduledDailyTasks,
  {}
);

export default crons;
