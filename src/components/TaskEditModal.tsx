import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Task, TaskStatus } from "../types";
import TimePicker from "./TimePicker";
import { getCurrentWeekId, getNextWeekId } from "../utils/weekUtils";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

interface TaskEditModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
}

export default function TaskEditModal({ isOpen, task, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueTime, setDueTime] = useState("");
  const [selectedDay, setSelectedDay] = useState<{ value: TaskStatus; weekId: string } | null>(null);

  const updateTask = useMutation(api.tasks.updateTask);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);

  const currentWeekId = getCurrentWeekId();
  const nextWeekId = getNextWeekId();

  const today = new Date();
  const todayDayIndex = today.getDay();

  const getWeekOptions = (weekId: string) => {
    const [y, m, d] = weekId.split("-").map(Number);
    const sunday = new Date(y, m - 1, d);
    return DAY_NAMES.map((day, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      return { value: day as TaskStatus, weekId, date };
    });
  };

  const currentWeekOptions = getWeekOptions(currentWeekId);
  const nextWeekOptions = getWeekOptions(nextWeekId);

  const isDateInPast = (date: Date) => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d < t;
  };

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setDueTime(task.dueTime || "");
      if (task.status !== "backlog" && task.status !== "completed") {
        setSelectedDay({ value: task.status, weekId: (task as any).weekId || currentWeekId });
      } else {
        setSelectedDay(null);
      }
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task) return;

    try {
      // Update title/description/priority/dueTime
      await updateTask({
        taskId: task._id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueTime: dueTime || undefined,
      });

      // If the day changed, reschedule
      const currentTaskDay = task.status !== "backlog" && task.status !== "completed" ? task.status : null;
      const currentTaskWeekId = (task as any).weekId;
      const newDay = selectedDay?.value ?? null;
      const newWeekId = selectedDay?.weekId;

      const dayChanged = currentTaskDay !== newDay || currentTaskWeekId !== newWeekId;

      if (dayChanged) {
        if (newDay && newDay !== "backlog" && newDay !== "completed") {
          await scheduleTaskToWeek({
            taskId: task._id,
            newStatus: newDay,
            weekId: newWeekId,
            dueTime: dueTime || undefined,
          });
        } else if (!newDay) {
          // Moving to backlog
          await scheduleTaskToWeek({
            taskId: task._id,
            newStatus: "backlog",
          });
        }
      }

      onClose();
    } catch (error) {
      // Task update failed - modal will remain open for retry
    }
  };

  if (!isOpen || !task) return null;

  const isDayTask = task.status !== "backlog" && task.status !== "completed";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[90vh] overflow-y-auto border border-muted">
        <div className="p-4 border-b border-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Edit Task</h2>
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
                  <div className={`p-2.5 border-2 rounded-lg text-center text-sm font-medium ${
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Schedule
            </label>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className={`w-full p-2 rounded-lg border text-center transition-colors touch-manipulation min-h-[44px] relative ${
                !selectedDay
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
              {currentWeekOptions.map((opt) => {
                const past = isDateInPast(opt.date);
                const isCurrentToday = opt.date.toDateString() === today.toDateString();
                const selected = selectedDay?.value === opt.value && selectedDay?.weekId === opt.weekId;
                return (
                  <button
                    key={`cw-${opt.value}`}
                    type="button"
                    disabled={past}
                    onClick={() => setSelectedDay({ value: opt.value, weekId: opt.weekId })}
                    className={`p-2 rounded-md transition-colors touch-manipulation min-h-[44px] text-center ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : past
                          ? 'bg-secondary/50 text-muted cursor-not-allowed'
                          : isCurrentToday
                            ? 'border-blue-500 border-2 text-foreground hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className="text-xs font-medium">{opt.value.charAt(0).toUpperCase()}</div>
                    <div className="text-xs opacity-70">{opt.date.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Week */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Next Week</h3>
            <div className="grid grid-cols-7 gap-1">
              {nextWeekOptions.map((opt) => {
                const selected = selectedDay?.value === opt.value && selectedDay?.weekId === opt.weekId;
                return (
                  <button
                    key={`nw-${opt.value}`}
                    type="button"
                    onClick={() => setSelectedDay({ value: opt.value, weekId: opt.weekId })}
                    className={`p-2 rounded-md transition-colors touch-manipulation min-h-[44px] text-center ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted text-foreground hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className="text-xs font-medium">{opt.value.charAt(0).toUpperCase()}</div>
                    <div className="text-xs opacity-70">{opt.date.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Time - show when on a day */}
          {selectedDay && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reminder <span className="text-tertiary font-normal">(Slack notification)</span>
              </label>
              <TimePicker
                value={dueTime}
                onChange={setDueTime}
                onClear={() => setDueTime("")}
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4" style={{paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`}}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-3.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-opacity min-h-[48px]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
