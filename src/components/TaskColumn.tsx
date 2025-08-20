import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";
import TaskCard from "./TaskCard";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  onStatusChange: (taskId: Id<"tasks">, newStatus: TaskStatus) => void;
  onComplete: (taskId: Id<"tasks">) => void;
  onDelete: (taskId: Id<"tasks">) => void;
  isToday?: boolean;
  date?: string;
  isBacklog?: boolean;
}

export default function TaskColumn({ 
  title, 
  tasks, 
  onStatusChange, 
  onComplete,
  onDelete,
  isToday = false,
  date,
  isBacklog = false
}: TaskColumnProps) {
  return (
    <div className={`kanban-column ${isToday ? 'today' : ''} ${isBacklog ? 'backlog' : ''}`}>
      <div className="kanban-column-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            {title} {isToday && "•"}
          </h2>
          {date && (
            <p className="text-xs text-tertiary mt-0.5">
              {date}
            </p>
          )}
        </div>
        <span className="text-xs text-tertiary bg-muted/50 px-2 py-0.5 rounded-full min-w-5 text-center">
          {tasks.length}
        </span>
      </div>
      <div className="pb-3 min-h-20">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            onStatusChange={onStatusChange}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-tertiary text-xs opacity-60">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}