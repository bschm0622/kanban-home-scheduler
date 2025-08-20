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
          {task.status === 'completed' && (
            <div className="text-xs text-tertiary mb-2 px-1">
              Reopen task:
            </div>
          )}
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
                {day === 'monday' ? 'M' : 
                 day === 'tuesday' ? 'T' : 
                 day === 'wednesday' ? 'W' : 
                 day === 'thursday' ? 'R' : 
                 day === 'friday' ? 'F' : 
                 day === 'saturday' ? 'S' : 'U'}
              </button>
            ))}
          </div>
          <div className="task-action-grid mt-2" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task._id, "backlog");
              }}
              className="action-button day flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                <path d="M320-280q17 0 28.5-11.5T360-320q0-17-11.5-28.5T320-360q-17 0-28.5 11.5T280-320q0 17 11.5 28.5T320-280Zm0-160q17 0 28.5-11.5T360-480q0-17-11.5-28.5T320-520q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440Zm0-160q17 0 28.5-11.5T360-640q0-17-11.5-28.5T320-680q-17 0-28.5 11.5T280-640q0 17 11.5 28.5T320-600Zm120 320h240v-80H440v80Zm0-160h240v-80H440v80Zm0-160h240v-80H440v80ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
              </svg>
              Backlog
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