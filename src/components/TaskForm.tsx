import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { TaskStatus } from "../types";

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskForm({ isOpen, onClose }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<Exclude<TaskStatus, "completed">>("backlog");
  
  const createTask = useMutation(api.tasks.createTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
      });
      
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("backlog");
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Assign to
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Exclude<TaskStatus, "completed">)}
              className="w-full p-3 border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-base bg-surface text-foreground"
            >
              <option value="backlog">Backlog</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-opacity"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}