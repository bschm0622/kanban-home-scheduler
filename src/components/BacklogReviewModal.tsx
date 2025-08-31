import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";

interface BacklogReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekId: string;
  nextWeekId: string;
}

export default function BacklogReviewModal({ isOpen, onClose, currentWeekId, nextWeekId }: BacklogReviewModalProps) {
  const [scheduledTasks, setScheduledTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [deletedTasks, setDeletedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [skippedTasks, setSkippedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [hasMarkedReviewed, setHasMarkedReviewed] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [oldestTasks, setOldestTasks] = useState<any[]>([]);
  
  const allOldestTasks = useQuery(api.tasks.getOldestBacklogTasks);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const markBacklogReviewed = useMutation(api.userSettings.markBacklogReviewed);
  
  const resetModalState = () => {
    setScheduledTasks(new Set());
    setDeletedTasks(new Set());
    setSkippedTasks(new Set());
    setExpandedTasks(new Set());
    setOldestTasks([]);
    // DON'T reset hasMarkedReviewed - we want to remember we did the review this week
  };
  
  // Set initial tasks only once when modal opens
  useEffect(() => {
    if (isOpen && allOldestTasks && oldestTasks.length === 0) {
      const tasks = allOldestTasks.slice(0, 5);
      setOldestTasks(tasks);
      // Auto-expand all tasks for easier review
      setExpandedTasks(new Set(tasks.map(task => task._id)));
    }
  }, [isOpen, allOldestTasks, oldestTasks.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);
  
  if (!isOpen || !oldestTasks) return null;

  // Calculate dates for a specific week (same as TaskForm)
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId);
    
    const dates: Array<{value: TaskStatus, label: string, weekId: string}> = [];
    
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    dayNames.forEach((day, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push({
        value: day,
        label: `${dayLabels[index]} (${dateStr})`,
        weekId: weekId
      });
    });
    
    return dates;
  };

  const currentWeekOptions = getWeekDates(currentWeekId);
  const nextWeekOptions = getWeekDates(nextWeekId);

  const handleScheduleTask = async (taskId: Id<"tasks">, weekId: string, day: string) => {
    try {
      await scheduleTaskToWeek({
        taskId,
        newStatus: day as any,
        weekId,
      });
      setScheduledTasks(prev => new Set([...prev, taskId]));
    } catch (error) {
      // Handle error - task will remain visible
    }
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    try {
      await deleteTask({ taskId });
      setDeletedTasks(prev => new Set([...prev, taskId]));
    } catch (error) {
      // Handle error - task will remain visible
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

  const handleCompleteReview = async () => {
    if (!hasMarkedReviewed) {
      await markBacklogReviewed();
      setHasMarkedReviewed(true);
    }
    // Reset all state when closing
    resetModalState();
    onClose();
  };

  // Calculate which tasks have been dealt with (scheduled, deleted, or skipped)
  const processedTasks = new Set([...scheduledTasks, ...deletedTasks, ...skippedTasks]);
  const unreviewed = oldestTasks.filter(task => !processedTasks.has(task._id));
  
  // Only show success screen when ALL tasks are processed AND we haven't shown it yet
  const allTasksProcessed = unreviewed.length === 0 && oldestTasks.length > 0;

  const formatCreatedDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Created: Today";
    if (diffInDays === 1) return "Created: Yesterday"; 
    if (diffInDays < 7) return `Created: ${diffInDays} days ago`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Created: ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    const months = Math.floor(diffInDays / 30);
    return `Created: ${months} ${months === 1 ? 'month' : 'months'} ago`;
  };

  const getPriorityColor = (priority: "low" | "medium" | "high") => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && allTasksProcessed) {
          resetModalState();
          onClose();
        }
      }}
    >
      <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg border border-muted max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                <path d="M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z"/>
              </svg>
              Weekly Backlog Review
            </h2>
            {allTasksProcessed && (
              <button
                onClick={() => {
                  resetModalState();
                  onClose();
                }}
                className="text-tertiary hover:text-foreground text-2xl leading-none"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-sm text-tertiary mt-2">
            {!allTasksProcessed
              ? `Review your ${oldestTasks.length} oldest backlog tasks. Schedule them for this week, next week, or delete if no longer needed.`
              : "Great! You've reviewed all your oldest backlog tasks."
            }
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!allTasksProcessed ? (
            <div className="space-y-3">
              {unreviewed.map((task) => {
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
                          <div className="text-xs text-tertiary mt-1">
                            {formatCreatedDate(task.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center ml-2">
                          {/* Quick delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this task?')) {
                                handleDeleteTask(task._id);
                              }
                            }}
                            className="w-8 h-8 rounded border-2 border-muted hover:border-red-500 flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete task"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="task-actions">
                        {/* This Week */}
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
                                className="p-3 rounded-md border transition-colors touch-manipulation min-h-[48px] text-center border-muted text-foreground hover:border-primary/50 hover:bg-primary/5"
                              >
                                <div className="text-xs font-medium">{option.value.charAt(0).toUpperCase()}</div>
                                <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Next Week */}
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
                                className="p-3 rounded-md border transition-colors touch-manipulation min-h-[48px] text-center border-muted text-foreground hover:border-primary/50 hover:bg-primary/5"
                              >
                                <div className="text-xs font-medium">{option.value.charAt(0).toUpperCase()}</div>
                                <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Keep in backlog button - matches TaskForm styling exactly */}
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSkipTask(task._id);
                            }}
                            className="w-full p-3 rounded-lg border text-center transition-colors touch-manipulation min-h-[48px] relative border-muted text-foreground hover:border-primary/50 hover:bg-primary/5"
                          >
                            <div className="font-medium">Backlog</div>
                            <div className="text-xs opacity-70">Keep unscheduled</div>
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#22c55e">
                  <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Review Complete!</h3>
              <p className="text-tertiary">
                You've reviewed all your oldest backlog tasks. Your backlog is now clean and up to date.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-muted">
          <div className="flex space-x-3" style={{paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`}}>
            {!allTasksProcessed ? (
              <button
                onClick={() => {
                  // Skip all remaining tasks
                  const remaining = unreviewed.map(task => task._id);
                  setSkippedTasks(prev => new Set([...prev, ...remaining]));
                }}
                className="flex-1 px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
              >
                Skip Remaining ({unreviewed.length})
              </button>
            ) : (
              <button
                onClick={handleCompleteReview}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}