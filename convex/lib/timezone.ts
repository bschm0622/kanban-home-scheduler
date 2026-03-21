// Shared timezone utility — all date logic uses EST/EDT consistently
// This prevents weekId mismatches between server-side (UTC) and client expectations (EST)

export type DayStatus = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const DAYS: DayStatus[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Get a Date object representing the current time in EST/EDT
export function getESTDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

// Get today's date as YYYY-MM-DD in EST
export function getESTDateString(): string {
  const est = getESTDate();
  const year = est.getFullYear();
  const month = String(est.getMonth() + 1).padStart(2, '0');
  const day = String(est.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get a date string from a timestamp, interpreted in EST
export function getESTDateFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const est = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = est.getFullYear();
  const month = String(est.getMonth() + 1).padStart(2, '0');
  const day = String(est.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get current day name in EST (lowercase, matches task status values)
export function getCurrentDayNameEST(): DayStatus {
  return DAYS[getESTDate().getDay()];
}

// Get yesterday's day name in EST
export function getYesterdayDayNameEST(): DayStatus {
  const est = getESTDate();
  est.setDate(est.getDate() - 1);
  return DAYS[est.getDay()];
}

// Get current week ID (Sunday of current week, YYYY-MM-DD format) in EST
export function getCurrentWeekIdEST(): string {
  const est = getESTDate();
  const day = est.getDay(); // 0 = Sunday
  est.setDate(est.getDate() - day);
  const year = est.getFullYear();
  const month = String(est.getMonth() + 1).padStart(2, '0');
  const d = String(est.getDate()).padStart(2, '0');
  return `${year}-${month}-${d}`;
}

// Get week ID for a specific date
export function getWeekIdForDate(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the start-of-day and end-of-day timestamps for today in EST
// Useful for querying "tasks completed today"
export function getTodayBoundsEST(): { startOfDay: number; endOfDay: number } {
  const est = getESTDate();
  // Start of today in EST
  const startEST = new Date(est.getFullYear(), est.getMonth(), est.getDate(), 0, 0, 0, 0);
  // End of today in EST
  const endEST = new Date(est.getFullYear(), est.getMonth(), est.getDate(), 23, 59, 59, 999);

  // Convert back to UTC timestamps by calculating the offset
  // EST offset from the actual UTC time
  const now = new Date();
  const utcTime = now.getTime();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime();
  const offsetMs = utcTime - estTime;

  return {
    startOfDay: startEST.getTime() + offsetMs,
    endOfDay: endEST.getTime() + offsetMs,
  };
}

// Convert a weekId + day name + time string ("HH:MM") to a UTC timestamp
// Used for scheduling task reminders
export function getESTTimestamp(weekId: string, dayName: DayStatus, time: string): number {
  const dayIndex = DAYS.indexOf(dayName);
  const [hours, minutes] = time.split(':').map(Number);

  // weekId is the Sunday of the week (YYYY-MM-DD)
  const sunday = new Date(weekId + 'T00:00:00');
  const targetDate = new Date(sunday);
  targetDate.setDate(sunday.getDate() + dayIndex);
  targetDate.setHours(hours, minutes, 0, 0);

  // targetDate is now the local time we want in EST — convert to UTC
  const now = new Date();
  const utcTime = now.getTime();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime();
  const offsetMs = utcTime - estTime;

  return targetDate.getTime() + offsetMs;
}
