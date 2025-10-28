import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";

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
  const [step, setStep] = useState(1); // 1 = Review, 2 = Backlog, 3 = Commitments
  const [reflectionNote, setReflectionNote] = useState("");
  const [scheduledTasks, setScheduledTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [deletedTasks, setDeletedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [skippedTasks, setSkippedTasks] = useState<Set<Id<"tasks">>>(new Set());
  const [selectedCommitments, setSelectedCommitments] = useState<Set<Id<"tasks">>>(new Set());
  const [weekTheme, setWeekTheme] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Set<Id<"tasks">>>(new Set());

  // Queries
  const weeklySummary = useQuery(api.weeklyReview.getWeeklySummary, { weekId: currentWeekId });
  const oldestBacklogTasks = useQuery(api.tasks.getOldestBacklogTasks);
  const nextWeekData = useQuery(api.tasks.getWeekTasks, { weekId: nextWeekId });
  const streakData = useQuery(api.streaks.getStreak);

  // Mutations
  const markReviewed = useMutation(api.weeklyReview.markWeekReviewed);
  const setCommitments = useMutation(api.weeklyReview.setWeekCommitments);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);
  const deleteTask = useMutation(api.tasks.deleteTask);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setReflectionNote("");
      setScheduledTasks(new Set());
      setDeletedTasks(new Set());
      setSkippedTasks(new Set());
      setSelectedCommitments(new Set());
      setWeekTheme("");
      setExpandedTasks(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper functions
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId);
    const dates: Array<{value: TaskStatus, label: string, weekId: string}> = [];
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    dayNames.forEach((day, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push({ value: day, label: `${dayLabels[index]} (${dateStr})`, weekId });
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

  const toggleCommitment = (taskId: Id<"tasks">) => {
    setSelectedCommitments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        if (newSet.size < 5) {
          newSet.add(taskId);
        }
      }
      return newSet;
    });
  };

  const handleFinish = async () => {
    // Save commitments
    if (selectedCommitments.size > 0) {
      await setCommitments({
        weekId: nextWeekId,
        taskIds: Array.from(selectedCommitments),
        weekTheme: weekTheme || undefined,
      });
    }

    // Mark review as complete
    await markReviewed({
      weekId: currentWeekId,
      reflectionNote: reflectionNote || undefined,
    });

    onClose();
  };

  const processedTasks = new Set([...scheduledTasks, ...deletedTasks, ...skippedTasks]);
  const unreviewedBacklog = (oldestBacklogTasks || []).filter(task => !processedTasks.has(task._id));

  // Get potential commitment tasks (from next week + backlog)
  const potentialCommitments = [
    ...(nextWeekData?.weekTasks || []),
    ...(oldestBacklogTasks || []).slice(0, 10),
  ];

  // Step 1: Weekly Review & Reflection
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50">
        <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg border border-muted max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-muted">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                📊 Week Review
              </h2>
              <button onClick={onClose} className="text-tertiary hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
              <div className="flex-1 h-1.5 bg-muted rounded"></div>
              <div className="flex-1 h-1.5 bg-muted rounded"></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {weeklySummary && (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Week Complete!</h3>
                  <p className="text-tertiary">Here's how you did this week</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{weeklySummary.completedTasks}</div>
                    <div className="text-xs text-tertiary">Tasks Completed</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{weeklySummary.completionRate}%</div>
                    <div className="text-xs text-tertiary">Completion Rate</div>
                  </div>
                  {weeklySummary.commitmentTasks > 0 && (
                    <>
                      <div className="bg-secondary rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-foreground">{weeklySummary.completedCommitments}/{weeklySummary.commitmentTasks}</div>
                        <div className="text-xs text-tertiary">Commitments</div>
                      </div>
                      <div className="bg-secondary rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-foreground">{weeklySummary.commitmentRate}%</div>
                        <div className="text-xs text-tertiary">Commitment Rate</div>
                      </div>
                    </>
                  )}
                  {streakData && streakData.currentStreak > 0 && (
                    <div className="bg-secondary rounded-lg p-4 text-center col-span-2">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">🔥 {streakData.currentStreak} days</div>
                      <div className="text-xs text-tertiary">Current Streak</div>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quick Reflection (optional)
                  </label>
                  <textarea
                    value={reflectionNote}
                    onChange={(e) => setReflectionNote(e.target.value)}
                    placeholder="What helped you succeed this week? What could be improved?"
                    className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-foreground placeholder-tertiary resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-muted">
            <button
              onClick={() => setStep(2)}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
            >
              Next: Clean Up Backlog →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Backlog Cleanup
  if (step === 2) {
    const currentWeekOptions = getWeekDates(currentWeekId);
    const nextWeekOptions = getWeekDates(nextWeekId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50">
        <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg border border-muted max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-muted">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                🧹 Backlog Cleanup
              </h2>
              <button onClick={onClose} className="text-tertiary hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-tertiary">Review your oldest backlog tasks</p>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
              <div className="flex-1 h-1.5 bg-muted rounded"></div>
            </div>
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
                                  className="p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center border-muted text-foreground hover:border-primary/50 hover:bg-primary/5 text-xs"
                                >
                                  {option.value.charAt(0).toUpperCase()}
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
                                  className="p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center border-muted text-foreground hover:border-primary/50 hover:bg-primary/5 text-xs"
                                >
                                  {option.value.charAt(0).toUpperCase()}
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
                              className="w-full p-3 rounded-lg border text-center transition-colors touch-manipulation min-h-[48px] border-muted text-foreground hover:border-primary/50 hover:bg-primary/5"
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
                <p className="text-tertiary">Backlog cleaned up!</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-muted flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
            >
              {unreviewedBacklog.length > 0 ? `Skip Remaining (${unreviewedBacklog.length})` : 'Next: Set Commitments →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Set Commitments
  if (step === 3) {
    const backlogOptions = (oldestBacklogTasks || []).slice(0, 10);
    const nextWeekOptions = nextWeekData?.weekTasks || [];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50">
        <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg border border-muted max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-muted">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                🎯 Next Week's Commitments
              </h2>
              <button onClick={onClose} className="text-tertiary hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-tertiary">Pick 3-5 must-do tasks for next week</p>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
              <div className="flex-1 h-1.5 bg-primary rounded"></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Weekly Theme (optional)
              </label>
              <input
                type="text"
                value={weekTheme}
                onChange={(e) => setWeekTheme(e.target.value)}
                placeholder='e.g., "Health Week", "Deep Work", "Get Organized"'
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-foreground placeholder-tertiary"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">Select Tasks ({selectedCommitments.size}/5)</h3>
              </div>
            </div>

            {nextWeekOptions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-tertiary mb-2">From Next Week's Schedule</h4>
                <div className="space-y-2">
                  {nextWeekOptions.slice(0, 10).map((task) => (
                    <button
                      key={task._id}
                      onClick={() => toggleCommitment(task._id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedCommitments.has(task._id)
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedCommitments.has(task._id)
                            ? 'border-primary bg-primary text-white'
                            : 'border-muted'
                        }`}>
                          {selectedCommitments.has(task._id) && '✓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-tertiary mt-1">{task.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {backlogOptions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-tertiary mb-2">From Backlog</h4>
                <div className="space-y-2">
                  {backlogOptions.map((task) => (
                    <button
                      key={task._id}
                      onClick={() => toggleCommitment(task._id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedCommitments.has(task._id)
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedCommitments.has(task._id)
                            ? 'border-primary bg-primary text-white'
                            : 'border-muted'
                        }`}>
                          {selectedCommitments.has(task._id) && '✓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-tertiary mt-1">{task.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-muted flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
            >
              {selectedCommitments.size > 0 ? `Set ${selectedCommitments.size} Commitments ✓` : 'Skip & Finish'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
