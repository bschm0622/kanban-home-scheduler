import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "send daily tasks to slack",
  { hourUTC: 11, minuteUTC: 0 }, // 7:00 AM EST = 11:00 UTC
  internal.slackNotifications.sendScheduledDailyTasks,
  {}
);

export default crons;
