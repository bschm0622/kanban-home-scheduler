import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { TaskStatus } from "../types";

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeekId: string;
  nextWeekId: string;
  viewingCurrentWeek: boolean;
}

export default function TaskForm({ isOpen, onClose, currentWeekId, nextWeekId, viewingCurrentWeek }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedOption, setSelectedOption] = useState<{value: TaskStatus, weekId: string} | null>({ value: "backlog", weekId: "" });
  
  const createTask = useMutation(api.tasks.createTask);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);

  // Calculate dates for a specific week
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId + 'T00:00:00');
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedOption) return;

    try {
      // Create the task first
      const taskId = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status: "backlog", // Always create in backlog first
      });
      
      // If it's not backlog, schedule it to the appropriate week
      if (selectedOption.value !== "backlog") {
        await scheduleTaskToWeek({
          taskId,
          newStatus: selectedOption.value,
          weekId: selectedOption.weekId,
        });
      }
      
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSelectedOption({ value: "backlog", weekId: "" });
      onClose();
    } catch (error) {
      // Task creation failed - form will remain open for retry
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-y-auto border border-muted">
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">New Task</h2>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-foreground text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base resize-none bg-surface text-foreground"
              rows={3}
              placeholder="Add details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "low", label: "Low", color: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200" },
                { value: "medium", label: "Medium", color: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200" },
                { value: "high", label: "High", color: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200" }
              ].map(({ value, label, color }) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={value}
                    checked={priority === value}
                    onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                    className="sr-only"
                  />
                  <div className={`p-3 border-2 rounded-lg text-center text-sm font-medium ${
                    priority === value ? color : "bg-secondary border-muted text-tertiary"
                  }`}>
                    {label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Backlog Option */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Schedule for
            </label>
            <button
              type="button"
              onClick={() => setSelectedOption({ value: "backlog", weekId: "" })}
              className={`w-full p-2 rounded-lg border text-center transition-colors touch-manipulation min-h-[44px] relative ${
                selectedOption?.value === "backlog" 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="font-medium">Backlog</div>
              <div className="text-xs opacity-70">Not scheduled</div>
            </button>
          </div>

          {/* This Week */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">This Week</h3>
            <div className="grid grid-cols-7 gap-1">
              {currentWeekOptions.map((option) => (
                <button
                  type="button"
                  key={`current-${option.value}`}
                  onClick={() => setSelectedOption({ value: option.value, weekId: option.weekId })}
                  className={`p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center ${
                    selectedOption?.value === option.value && selectedOption?.weekId === option.weekId
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-xs font-medium">{option.value.charAt(0).toUpperCase()}</div>
                  <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Next Week */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Next Week</h3>
            <div className="grid grid-cols-7 gap-1">
              {nextWeekOptions.map((option) => (
                <button
                  type="button"
                  key={`next-${option.value}`}
                  onClick={() => setSelectedOption({ value: option.value, weekId: option.weekId })}
                  className={`p-2 rounded-md border transition-colors touch-manipulation min-h-[44px] text-center ${
                    selectedOption?.value === option.value && selectedOption?.weekId === option.weekId
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="text-xs font-medium">{option.value.charAt(0).toUpperCase()}</div>
                  <div className="text-xs opacity-70">{option.label.split(' (')[1]?.replace(')', '').split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-6" style={{paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`}}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !selectedOption}
              className={`flex-1 px-4 py-4 rounded-lg font-medium touch-manipulation transition-opacity min-h-[48px] ${
                title.trim() && selectedOption
                  ? 'bg-primary text-white hover:opacity-90' 
                  : 'bg-muted text-tertiary cursor-not-allowed opacity-50'
              }`}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}