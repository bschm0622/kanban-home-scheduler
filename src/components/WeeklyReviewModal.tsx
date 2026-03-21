import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TaskStatus } from "../types";

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekId: string;
  nextWeekId: string;
}

export default function WeeklyReviewModal({
  isOpen,
  onClose,
  currentWeekId,
  nextWeekId
}: WeeklyReviewModalProps) {
  const [scheduledTasks, setScheduledTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [deletedTasks, setDeletedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [skippedTasks, setSkippedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<Id<"tasks">>>(new Set());

  const oldestBacklogTasks = useQuery(api.tasks.getOldestBacklogTasks);
  const markReviewed = useMutation(api.weeklyReview.markWeekReviewed);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleDismiss = async () => {
    await markReviewed({ weekId: currentWeekId });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setScheduledTasks(new Set());
      setDeletedTasks(new Set());
      setSkippedTasks(new Set());
      setExpandedTasks(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getWeekDates = (weekId: string) => {
    const [y, m, d] = weekId.split('-').map(Number);
    const sunday = new Date(y, m - 1, d);
    const dates: Array<{value: TaskStatus, label: string, weekId: string, date: Date}> = [];
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    dayNames.forEach((day, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      dates.push({ value: day, label: dayLabels[index], weekId, date });
    });

    return dates;
  };

  const handleScheduleTask = async (taskId: Id<"tasks">, weekId: string, day: string) => {
    try {
      await scheduleTaskToWeek({ taskId, newStatus: day as any, weekId });
      setScheduledTasks(prev => new Set([...prev, taskId]));
    } catch (error) {
      // Handle error
    }
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    try {
      await deleteTask({ taskId });
      setDeletedTasks(prev => new Set([...prev, taskId]));
    } catch (error) {
      // Handle error
    }
  };

  const handleSkipTask = (taskId: Id<"tasks">) => {
    setSkippedTasks(prev => new Set([...prev, taskId]));
  };

  const toggleTaskExpanded = (taskId: Id<"tasks">) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const processedTasks = new Set([...scheduledTasks, ...deletedTasks, ...skippedTasks]);
  const unreviewedBacklog = (oldestBacklogTasks || []).filter(task => !processedTasks.has(task._id));

  const currentWeekOptions = getWeekDates(currentWeekId);
  const nextWeekOptions = getWeekDates(nextWeekId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50">
      <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg border border-muted max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              🧹 Backlog Triage
            </h2>
            <button onClick={handleDismiss} className="text-tertiary hover:text-foreground text-2xl leading-none">×</button>
          </div>
          <p className="text-sm text-tertiary">Review your oldest backlog tasks — schedule, delete, or skip</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {unreviewedBacklog.length > 0 ? (
            <div className="space-y-3">
              {unreviewedBacklog.map((task) => {
                const isExpanded = expandedTasks.has(task._id);

                return (
                  <div
                    key={task._id}
                    className={`task-card priority-${task.priority}`}
                    onClick={() => toggleTaskExpanded(task._id)}
                  >
                    <div className="task-content">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground text-sm leading-snug">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-tertiary mt-1 leading-relaxed">{task.description}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this task?')) {
                              handleDeleteTask(task._id);
                            }
                          }}
                          className="w-8 h-8 rounded border-2 border-muted hover:border-red-500 flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="task-actions">
                        <div className="mt-2">
                          <h4 className="text-xs font-medium text-tertiary mb-2">This Week</h4>
                          <div className="grid grid-cols-7 gap-1">
                            {currentWeekOptions.map((option) => (
                              <button
                                key={`current-${option.value}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScheduleTask(task._id, currentWeekId, option.value);
                                }}
                                className="p-2 rounded-lg border border-muted transition-colors touch-manipulation min-h-[44px] text-center text-foreground hover:border-primary/50 hover:bg-primary/5 text-xs"
                              >
                                <div className="font-medium">{option.value.charAt(0).toUpperCase()}</div>
                                <div className="opacity-70">{option.date.getDate()}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-tertiary mb-2">Next Week</h4>
                          <div className="grid grid-cols-7 gap-1">
                            {nextWeekOptions.map((option) => (
                              <button
                                key={`next-${option.value}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScheduleTask(task._id, nextWeekId, option.value);
                                }}
                                className="p-2 rounded-lg border border-muted transition-colors touch-manipulation min-h-[44px] text-center text-foreground hover:border-primary/50 hover:bg-primary/5 text-xs"
                              >
                                <div className="font-medium">{option.value.charAt(0).toUpperCase()}</div>
                                <div className="opacity-70">{option.date.getDate()}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSkipTask(task._id);
                            }}
                            className="w-full p-3 rounded-lg border border-muted text-center transition-colors touch-manipulation min-h-[48px] text-foreground hover:border-primary/50 hover:bg-primary/5"
                          >
                            <div className="font-medium text-sm">Keep in Backlog</div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-tertiary">Backlog is clean!</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-muted">
          <button
            onClick={handleDismiss}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
          >
            {unreviewedBacklog.length > 0 ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
