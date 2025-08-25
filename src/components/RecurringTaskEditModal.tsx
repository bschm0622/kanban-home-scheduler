import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { RecurringTask } from "../types";

interface RecurringTaskEditModalProps {
  isOpen: boolean;
  recurringTask: RecurringTask | null;
  onClose: () => void;
}

export default function RecurringTaskEditModal({ isOpen, recurringTask, onClose }: RecurringTaskEditModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    preferredDay: "" as "" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  });
  
  const updateRecurringTask = useMutation(api.recurringTasks.updateRecurringTask);

  useEffect(() => {
    if (recurringTask && isOpen) {
      setFormData({
        title: recurringTask.title,
        description: recurringTask.description || "",
        priority: recurringTask.priority,
        preferredDay: recurringTask.preferredDay || ""
      });
    }
  }, [recurringTask, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !recurringTask) return;

    try {
      await updateRecurringTask({
        taskId: recurringTask._id,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        preferredDay: formData.preferredDay || undefined,
      });
      
      onClose();
    } catch (error) {
      // Recurring task update failed - modal will remain open for retry
    }
  };

  if (!isOpen || !recurringTask) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-end sm:items-center sm:justify-center">
      <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col border border-muted">
        <div className="p-4 border-b border-muted flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Edit Recurring Task</h2>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
                placeholder="What needs to be done regularly?"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base resize-none bg-surface text-foreground"
                rows={2}
                placeholder="Add details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "low", label: "Low", color: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300" },
                  { value: "medium", label: "Medium", color: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300" },
                  { value: "high", label: "High", color: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300" }
                ].map(({ value, label, color }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={formData.priority === value}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as "low" | "medium" | "high"})}
                      className="sr-only"
                    />
                    <div className={`p-3 border-2 rounded-lg text-center text-sm font-medium ${
                      formData.priority === value ? color : "bg-surface border-muted text-tertiary"
                    }`}>
                      {label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Preferred Day (Optional)
              </label>
              <select
                value={formData.preferredDay}
                onChange={(e) => setFormData({...formData, preferredDay: e.target.value as "" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"})}
                className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
              >
                <option value="">Any day</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-muted flex-shrink-0" style={{paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`}}>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-4 bg-muted/30 text-tertiary rounded-lg font-medium hover:bg-muted/50 touch-manipulation transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.title.trim()}
                className="flex-1 px-4 py-4 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-opacity min-h-[48px]"
              >
                Update Task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}