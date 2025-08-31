import { useState, useEffect } from "react";
import type { TaskStatus } from "../types/index";

interface TaskScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (status: TaskStatus, weekId: string) => void;
  currentStatus: TaskStatus;
  currentTaskWeekId?: string;
  currentWeekId: string;
  nextWeekId: string;
  taskTitle?: string;
}

export default function TaskScheduleModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  currentStatus,
  currentTaskWeekId,
  currentWeekId,
  nextWeekId,
  taskTitle
}: TaskScheduleModalProps) {
  // Smart default: pre-select current assignment unless it's completed
  const getInitialSelection = () => {
    if (currentStatus === "completed") return null;
    if (currentStatus === "backlog") return { value: "backlog" as TaskStatus, weekId: "" };
    // For day statuses, use the task's actual weekId
    return { value: currentStatus, weekId: currentTaskWeekId || currentWeekId };
  };

  const [selectedOption, setSelectedOption] = useState<{value: TaskStatus, weekId: string} | null>(getInitialSelection());

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(getInitialSelection());
    }
  }, [isOpen, currentStatus, currentWeekId]);

  // Calculate dates for a specific week
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId);
    
    const dates: Array<{value: TaskStatus, label: string, weekId: string}> = [
      { value: "backlog", label: "Backlog", weekId: "" }
    ];
    
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
  
  // Combine options with week labels
  const allOptions = [
    { value: "backlog", label: "Backlog", weekId: "" },
    ...currentWeekOptions.slice(1).map(opt => ({ ...opt, label: `${opt.label} - This Week` })),
    ...nextWeekOptions.slice(1).map(opt => ({ ...opt, label: `${opt.label} - Next Week` }))
  ];

  if (!isOpen) return null;

  const handleSchedule = () => {
    if (selectedOption) {
      onSchedule(selectedOption.value, selectedOption.weekId);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg border border-muted">
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Schedule Task</h2>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-foreground text-2xl leading-none"
            >
              ×
            </button>
          </div>
          {taskTitle && (
            <div className="mt-2 p-2 bg-muted/30 rounded text-sm text-foreground font-medium">
              {taskTitle}
            </div>
          )}
          {currentStatus === "completed" && (
            <div className="mt-2 p-2 bg-accent/10 border border-accent/20 rounded text-sm text-accent">
              ⚠️ This will reopen the completed task. Choose where to reschedule it.
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Backlog Option */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Schedule for
            </label>
            <button
              onClick={() => setSelectedOption({ value: "backlog", weekId: "" })}
              className={`w-full p-2 rounded-lg border text-center transition-colors touch-manipulation min-h-[44px] relative ${
                selectedOption?.value === "backlog" 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="font-medium flex items-center justify-center gap-1">
                Backlog
                {currentStatus === "backlog" && <span className="text-xs">•</span>}
              </div>
              <div className="text-xs opacity-70">Not scheduled</div>
            </button>
          </div>

          {/* This Week */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">This Week</h3>
            <div className="grid grid-cols-7 gap-1">
              {currentWeekOptions.slice(1).map((option) => (
                <button
                  key={`current-${option.value}`}
                  onClick={() => setSelectedOption({ value: option.value, weekId: option.weekId })}
                  className={`p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center ${
                    selectedOption?.value === option.value && selectedOption?.weekId === option.weekId
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-xs font-medium flex items-center justify-center gap-0.5">
                    {option.value.charAt(0).toUpperCase()}
                    {currentStatus === option.value && currentTaskWeekId === option.weekId && <span className="text-xs">•</span>}
                  </div>
                  <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Next Week */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Next Week</h3>
            <div className="grid grid-cols-7 gap-1">
              {nextWeekOptions.slice(1).map((option) => (
                <button
                  key={`next-${option.value}`}
                  onClick={() => setSelectedOption({ value: option.value, weekId: option.weekId })}
                  className={`p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center ${
                    selectedOption?.value === option.value && selectedOption?.weekId === option.weekId
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-xs font-medium flex items-center justify-center gap-0.5">
                    {option.value.charAt(0).toUpperCase()}
                    {currentStatus === option.value && currentTaskWeekId === option.weekId && <span className="text-xs">•</span>}
                  </div>
                  <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-2" style={{paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`}}>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!selectedOption}
              className={`flex-1 px-4 py-3 rounded-lg font-medium touch-manipulation transition-opacity min-h-[48px] ${
                selectedOption 
                  ? 'bg-primary text-white hover:opacity-90' 
                  : 'bg-muted text-tertiary cursor-not-allowed'
              }`}
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}