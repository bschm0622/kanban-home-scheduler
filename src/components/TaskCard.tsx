import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: Id<"tasks">, newStatus: TaskStatus) => void;
  onComplete: (taskId: Id<"tasks">) => void;
  onDelete: (taskId: Id<"tasks">) => void;
  onEdit: (taskId: Id<"tasks">) => void;
  onSchedule: (taskId: Id<"tasks">) => void;
}

export default function TaskCard({ task, onStatusChange, onComplete, onDelete, onEdit, onSchedule }: TaskCardProps) {
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
          <div className="flex items-center ml-2">
            {/* Quick complete button - hide if already completed */}
            {task.status !== 'completed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task._id);
                }}
                className="w-5 h-5 rounded border-2 border-muted hover:border-green-500 flex items-center justify-center text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Mark as complete"
              >
                ✓
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="task-actions">
          <div className="task-action-grid mt-2" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(task._id);
              }}
              className="action-button day flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T520-440q0-17 11.5-28.5T560-480q17 0 28.5 11.5T600-440q0 17-11.5 28.5T560-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T520-280q0-17 11.5-28.5T560-320q17 0 28.5 11.5T600-280q0 17-11.5 28.5T560-240Z"/>
              </svg>
              Schedule
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task._id);
              }}
              className="action-button day flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
              </svg>
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this task?')) {
                  onDelete(task._id);
                }
              }}
              className="action-button day text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}