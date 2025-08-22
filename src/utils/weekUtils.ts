import type { TaskStatus } from "../types";

// Get current week ID (Sunday of current week in YYYY-MM-DD format)
export function getCurrentWeekId(): string {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = sunday.getDate() - day; // Days to subtract to get to Sunday
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Get next week ID (Sunday of next week in YYYY-MM-DD format)
export function getNextWeekId(): string {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = now.getDay();
  const diff = sunday.getDate() - day + 7; // Add 7 days for next week
  sunday.setDate(diff);
  return sunday.toISOString().split('T')[0];
}

// Calculate dates for a specific week
export function getWeekDates(weekId: string) {
  const sunday = new Date(weekId + 'T00:00:00'); // Parse the week ID as Sunday
  
  const dates: Record<string, string> = {};
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  
  dayNames.forEach((dayName, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    dates[dayName] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  return dates;
}

// Helper to get a clean week range display (Sun - Sat)
export function getWeekRange(weekId: string): string {
  const sunday = new Date(weekId + 'T00:00:00');
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  
  const startStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}