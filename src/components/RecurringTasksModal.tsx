import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { RecurringTask } from "../types";
import RecurringTaskEditModal from "./RecurringTaskEditModal";


interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecurringTasksModal({ isOpen, onClose }: RecurringTasksModalProps) {
  const recurringTasks = useQuery(api.recurringTasks.getRecurringTasks);
  const createRecurringTask = useMutation(api.recurringTasks.createRecurringTask);
  const deleteRecurringTask = useMutation(api.recurringTasks.deleteRecurringTask);
  const generateRecurringTasks = useMutation(api.recurringTasks.generateRecurringTasks);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"recurringTasks">>>(new Set());
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
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
        frequency: "weekly" as const,
        preferredDay: formData.preferredDay || undefined,
      });
      
      setFormData({
        title: "",
        description: "",
        priority: "medium", 
        preferredDay: ""
      });
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to create recurring task:", error);
    }
  };

  const handleGenerate = async () => {
    try {
      const taskIds = Array.from(selectedTasks);
      const selectedCount = taskIds.length;
      const result = await generateRecurringTasks({ taskIds });
      
      // Show appropriate message based on results
      if (result.generatedCount === 0) {
        if (selectedCount === 1) {
          setGenerateResult("That task has already been generated for this week");
        } else {
          setGenerateResult("Those tasks have already been generated for this week");
        }
      } else if (result.generatedCount === selectedCount) {
        setGenerateResult(`Generated ${result.generatedCount} new task${result.generatedCount === 1 ? '' : 's'} for this week!`);
      } else {
        const alreadyGenerated = selectedCount - result.generatedCount;
        setGenerateResult(`Generated ${result.generatedCount} new task${result.generatedCount === 1 ? '' : 's'}. ${alreadyGenerated} task${alreadyGenerated === 1 ? ' was' : 's were'} already generated this week.`);
      }
      
      setSelectedTasks(new Set());
      
      // Clear message after 4 seconds
      setTimeout(() => setGenerateResult(null), 4000);
    } catch (error) {
      console.error("Failed to generate recurring tasks:", error);
      setGenerateResult("Failed to generate tasks. Please try again.");
      setTimeout(() => setGenerateResult(null), 4000);
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
          {/* Generate result feedback */}
          {generateResult && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm text-center border border-blue-200 dark:border-blue-700">
              {generateResult}
            </div>
          )}

          {/* Select all / Generate section */}
          <div className="mb-4 space-y-2">
            {recurringTasks && recurringTasks.length > 0 && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-tertiary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size === recurringTasks.length && recurringTasks.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks(new Set(recurringTasks.map(task => task._id)));
                      } else {
                        setSelectedTasks(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-muted text-primary focus:ring-primary"
                  />
                  Select All
                </label>
                <span className="text-xs text-tertiary">
                  {selectedTasks.size} of {recurringTasks.length} selected
                </span>
              </div>
            )}
            
            <button
              onClick={handleGenerate}
              disabled={selectedTasks.size === 0}
              className={`w-full p-3 rounded-lg font-medium touch-manipulation transition-colors border ${
                selectedTasks.size > 0 
                  ? "bg-primary text-white hover:opacity-90 border-primary"
                  : "bg-muted/30 text-tertiary border-muted/50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
                  <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/>
                </svg>
                {selectedTasks.size > 0 
                  ? `Generate ${selectedTasks.size} Task${selectedTasks.size === 1 ? '' : 's'}`
                  : "Select Tasks to Generate"
                }
              </div>
            </button>
          </div>

          {/* Recurring tasks list */}
          <div className="space-y-2 mb-4">
            {recurringTasks?.map((task) => (
              <div
                key={task._id}
                className={`task-card priority-${task.priority}`}
              >
                <div className="task-content">
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task._id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTasks);
                        if (e.target.checked) {
                          newSelected.add(task._id);
                        } else {
                          newSelected.delete(task._id);
                        }
                        setSelectedTasks(newSelected);
                      }}
                      className="w-4 h-4 mt-1 rounded border-muted text-primary focus:ring-primary"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-tertiary mt-1">{task.description}</p>
                      )}
                      {task.preferredDay && (
                        <div className="mt-2 text-xs text-tertiary">
                          Preferred: {task.preferredDay}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-2 rounded-md text-xs font-medium touch-manipulation transition-colors bg-muted/50 text-tertiary hover:bg-muted min-h-[40px] flex items-center justify-center"
                        title="Edit task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                            deleteRecurringTask({ taskId: task._id });
                          }
                        }}
                        className="px-3 py-2 rounded-md text-xs font-medium touch-manipulation transition-colors bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 min-h-[40px] flex items-center justify-center"
                        title="Delete task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                      </button>
                    </div>
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

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-muted flex-shrink-0" style={{paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`}}>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full px-4 py-4 bg-muted/30 text-foreground rounded-lg font-medium hover:bg-muted/50 touch-manipulation transition-colors border border-muted/50 min-h-[48px]"
          >
            + Add Recurring Task
          </button>
        </div>
      </div>


      {/* Add Recurring Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end sm:items-center sm:justify-center">
          <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col border border-muted">
            <div className="p-4 border-b border-muted flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Add Recurring Task</h2>
                <button
                  onClick={() => setShowAddModal(false)}
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
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-4 bg-muted/30 text-tertiary rounded-lg font-medium hover:bg-muted/50 touch-manipulation transition-colors min-h-[48px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.title.trim()}
                    className="flex-1 px-4 py-4 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-opacity min-h-[48px]"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Recurring Task Modal */}
      <RecurringTaskEditModal 
        isOpen={showEditModal} 
        recurringTask={editingTask}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }} 
      />
    </div>
  );
}