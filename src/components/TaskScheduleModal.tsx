import { useState } from "react";
import type { TaskStatus } from "../types/index";

interface TaskScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (status: TaskStatus, weekId: string) => void;
  currentStatus: TaskStatus;
  currentWeekId: string;
  nextWeekId: string;
  taskTitle?: string;
}

export default function TaskScheduleModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  currentStatus,
  currentWeekId,
  nextWeekId,
  taskTitle
}: TaskScheduleModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(`${currentStatus}:`);

  // Calculate dates for a specific week
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId + 'T00:00:00');
    
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
    const selectedOption = allOptions.find(opt => `${opt.value}:${opt.weekId}` === selectedStatus);
    if (selectedOption) {
      onSchedule(selectedOption.value as TaskStatus, selectedOption.weekId);
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
          <p className="text-sm text-tertiary mt-2">Choose any day from this week or next week</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Schedule for
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
            >
              {allOptions.map((option) => (
                <option key={`${option.value}:${option.weekId}`} value={`${option.value}:${option.weekId}`}>
                  {option.label}
                </option>
              ))}
            </select>
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
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}