import type { Id } from "../../convex/_generated/dataModel";

export type TaskStatus = "backlog" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | "completed";

export interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  weekId?: string;
  completedAt?: number;
  createdAt: number;
}