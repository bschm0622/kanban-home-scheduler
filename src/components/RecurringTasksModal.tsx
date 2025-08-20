import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface RecurringTask {
  _id: Id<"recurringTasks">;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  frequency: "weekly" | "monthly";
  preferredDay?: string;
  isActive: boolean;
  createdAt: number;
}

interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecurringTasksModal({ isOpen, onClose }: RecurringTasksModalProps) {
  const recurringTasks = useQuery(api.recurringTasks.getRecurringTasks);
  const createRecurringTask = useMutation(api.recurringTasks.createRecurringTask);
  const toggleRecurringTask = useMutation(api.recurringTasks.toggleRecurringTask);
  const generateRecurringTasks = useMutation(api.recurringTasks.generateRecurringTasks);
  
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    frequency: "weekly" as "weekly" | "monthly",
    preferredDay: "" as "" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      await createRecurringTask({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        frequency: formData.frequency,
        preferredDay: formData.preferredDay || undefined,
      });
      
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        frequency: "weekly", 
        preferredDay: ""
      });
      setShowNewForm(false);
    } catch (error) {
      console.error("Failed to create recurring task:", error);
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateRecurringTasks();
      console.log(`Generated ${result.generatedCount} recurring tasks for this week`);
    } catch (error) {
      console.error("Failed to generate recurring tasks:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col border border-muted">
        <div className="p-4 border-b border-muted flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recurring Tasks</h2>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Generate button */}
          <button
            onClick={handleGenerate}
            className="w-full mb-4 p-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity"
          >
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/>
              </svg>
              Generate This Week's Tasks
            </div>
          </button>

          {/* Recurring tasks list */}
          <div className="space-y-2 mb-4">
            {recurringTasks?.map((task) => (
              <div
                key={task._id}
                className={`task-card priority-${task.priority} ${
                  !task.isActive ? "opacity-50" : ""
                }`}
              >
                <div className="task-content">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-tertiary mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2 text-xs text-tertiary">
                        <span>{task.frequency}</span>
                        {task.preferredDay && <span>• {task.preferredDay}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRecurringTask({ taskId: task._id })}
                      className={`action-button ${
                        task.isActive ? "primary" : "secondary"
                      }`}
                    >
                      {task.isActive ? "Active" : "Paused"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {(!recurringTasks || recurringTasks.length === 0) && (
              <div className="text-center py-8 text-tertiary text-sm">
                No recurring tasks yet
              </div>
            )}
          </div>

          {/* Add new recurring task form */}
          {showNewForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-secondary rounded-lg">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value as "weekly" | "monthly"})}
                    className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Preferred Day
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

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  Create Task
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-muted flex-shrink-0">
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity"
          >
            {showNewForm ? "Cancel" : "+ Add Recurring Task"}
          </button>
        </div>
      </div>
    </div>
  );
}