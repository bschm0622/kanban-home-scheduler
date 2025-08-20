import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: Id<"tasks">, newStatus: TaskStatus) => void;
  onComplete: (taskId: Id<"tasks">) => void;
  onDelete: (taskId: Id<"tasks">) => void;
}

export default function TaskCard({ task, onStatusChange, onComplete, onDelete }: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div 
      className={`task-card priority-${task.priority}`}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="task-content">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm leading-snug">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-tertiary mt-1 leading-relaxed">{task.description}</p>
            )}
          </div>
          <div className={`w-1.5 h-1.5 rounded-full mt-1 ml-2 ${
            task.priority === 'high' ? 'bg-red-500' : 
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          }`} />
        </div>
      </div>
      
      {showActions && (
        <div className="task-actions">
          <div className="task-action-row">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task._id);
              }}
              className="action-button primary"
            >
              ✓ Done
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task._id, "backlog");
              }}
              className="action-button secondary"
            >
              ← Back
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this task?')) {
                  onDelete(task._id);
                }
              }}
              className="action-button secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              🗑
            </button>
          </div>
          <div className="task-action-grid">
            {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
              <button
                key={day}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task._id, day as TaskStatus);
                }}
                className={`action-button day ${task.status === day ? 'active' : ''}`}
              >
                {day.slice(0, 1).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}