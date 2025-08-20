import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ArchivedWeek {
  _id: Id<"weeks">;
  weekId: string;
  startDate: string;
  endDate: string;
  isArchived: boolean;
  createdAt: number;
  completedTasks: Array<{
    _id: Id<"tasks">;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    completedAt?: number;
  }>;
  completedCount: number;
}

interface CompletionStat {
  weekId: string;
  startDate: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const archivedWeeks = useQuery(api.history.getArchivedWeeks);
  const completionStats = useQuery(api.history.getCompletionStats);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeekRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const selectedWeekData = archivedWeeks?.find(week => week.weekId === selectedWeek);

  if (selectedWeek && selectedWeekData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
        <div className="bg-surface w-full sm:w-96 sm:max-w-lg sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="kanban-header border-b border-muted flex-shrink-0">
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedWeek(null)}
                className="text-tertiary hover:text-foreground"
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-foreground">Week Details</h2>
              <button
                onClick={onClose}
                className="text-tertiary hover:text-foreground text-xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-1">
                {getWeekRange(selectedWeekData.startDate, selectedWeekData.endDate)}
              </h3>
              <p className="text-sm text-tertiary">
                {selectedWeekData.completedCount} tasks completed
              </p>
            </div>

            <div className="space-y-3">
              {selectedWeekData.completedTasks.map((task) => (
                <div
                  key={task._id}
                  className={`task-card priority-${task.priority} p-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-tertiary mt-1">{task.description}</p>
                      )}
                      {task.completedAt && (
                        <p className="text-xs text-tertiary mt-1">
                          Completed {new Date(task.completedAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                    <div className="ml-2">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                  </div>
                </div>
              ))}

              {selectedWeekData.completedTasks.length === 0 && (
                <div className="text-center py-8 text-tertiary text-sm">
                  No completed tasks this week
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-surface w-full sm:w-96 sm:max-w-lg sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="kanban-header border-b border-muted flex-shrink-0">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">📊 History</h2>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-foreground text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Completion Stats Summary */}
          {completionStats && completionStats.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-foreground mb-3">📈 Recent Performance</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary p-3 rounded-lg">
                  <div className="text-sm text-tertiary">Total Completed</div>
                  <div className="text-xl font-bold text-foreground">
                    {completionStats.reduce((sum, week) => sum + week.completedCount, 0)}
                  </div>
                </div>
                <div className="bg-secondary p-3 rounded-lg">
                  <div className="text-sm text-tertiary">Avg. Completion</div>
                  <div className="text-xl font-bold text-foreground">
                    {Math.round(
                      completionStats.reduce((sum, week) => sum + week.completionRate, 0) / 
                      completionStats.length
                    )}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Week List */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">📅 Past Weeks</h3>
            
            {archivedWeeks?.map((week) => {
              const completionRate = completionStats?.find(s => s.weekId === week.weekId)?.completionRate || 0;
              
              return (
                <button
                  key={week._id}
                  onClick={() => setSelectedWeek(week.weekId)}
                  className="w-full bg-secondary rounded-lg p-4 text-left hover:bg-muted transition-colors touch-manipulation"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground text-sm">
                        {getWeekRange(week.startDate, week.endDate)}
                      </div>
                      <div className="text-xs text-tertiary mt-1">
                        {week.completedCount} tasks completed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {completionRate}%
                      </div>
                      <div className="text-xs text-tertiary">
                        completion
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </button>
              );
            })}

            {(!archivedWeeks || archivedWeeks.length === 0) && (
              <div className="text-center py-8 text-tertiary text-sm">
                No completed weeks yet.<br />
                Complete your first week to see history here!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}