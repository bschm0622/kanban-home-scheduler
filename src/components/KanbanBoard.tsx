import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";
import TaskForm from "./TaskForm";
import RecurringTasksModal from "./RecurringTasksModal";
import HistoryModal from "./HistoryModal";
import TaskColumn from "./TaskColumn";

const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export default function KanbanBoard() {
  const data = useQuery(api.tasks.getCurrentWeekTasks);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const completeTask = useMutation(api.tasks.completeTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const rolloverWeek = useMutation(api.tasks.rolloverWeek);
  const autoRollover = useMutation(api.weekManager.autoRolloverPreviousWeeks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-rollover previous weeks on app load
  useEffect(() => {
    if (data) {
      autoRollover().then((result) => {
        if (result && result.movedTasksCount > 0) {
          console.log(`Auto-rolled over ${result.movedTasksCount} tasks from previous weeks`);
        }
      }).catch((error) => {
        console.error("Auto-rollover failed:", error);
      });
    }
  }, [data, autoRollover]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = (taskId: Id<"tasks">, newStatus: TaskStatus) => {
    updateTaskStatus({ taskId, newStatus });
  };

  const handleComplete = (taskId: Id<"tasks">) => {
    completeTask({ taskId });
  };

  const handleDelete = (taskId: Id<"tasks">) => {
    deleteTask({ taskId });
  };

  const handleRolloverWeek = async () => {
    try {
      const result = await rolloverWeek();
      setShowRolloverConfirm(false);
      // You could show a toast notification here
      console.log(`Moved ${result.movedTasks} incomplete tasks back to backlog`);
    } catch (error) {
      console.error("Failed to rollover week:", error);
    }
  };

  const groupTasksByStatus = () => {
    const groups: Record<TaskStatus, Task[]> = {
      backlog: data.backlogTasks,
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
      completed: []
    };

    data.weekTasks.forEach(task => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    return groups;
  };

  const taskGroups = groupTasksByStatus();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Calculate week dates
  const getWeekDates = () => {
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    
    const dates: Record<string, string> = {};
    dayNames.forEach((dayName, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      dates[dayName] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    return dates;
  };
  
  const weekDates = getWeekDates();
  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="app">
      {/* Minimal header */}
      <div className="app-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Home</h1>
            <p className="text-xs text-tertiary">
              {todayDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div dangerouslySetInnerHTML={{
              __html: `
                <button
                  type="button"
                  aria-label="Toggle theme"
                  class="theme-toggle-btn flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-muted/50"
                  onclick="
                    document.documentElement.classList.toggle('dark');
                    const isDark = document.documentElement.classList.contains('dark');
                    document.documentElement.classList.toggle('light', !isDark);
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 stroke-current dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" class="hidden h-4 w-4 stroke-current dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                  </svg>
                </button>
              `
            }} />
            <button
              onClick={() => setShowNewTask(true)}
              className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium touch-manipulation hover:opacity-90 transition-opacity"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Clean column layout */}
      <div className="kanban-columns">
        {/* Backlog */}
        <TaskColumn
          title="Backlog"
          tasks={taskGroups.backlog}
          onStatusChange={handleStatusChange}
          onComplete={handleComplete}
          onDelete={handleDelete}
          isBacklog={true}
        />

        {/* Week days */}
        {dayNames.map((day) => (
          <TaskColumn
            key={day}
            title={day.charAt(0).toUpperCase() + day.slice(1)}
            tasks={taskGroups[day]}
            onStatusChange={handleStatusChange}
            onComplete={handleComplete}
            onDelete={handleDelete}
            isToday={today === day}
            date={weekDates[day]}
          />
        ))}

        {/* Completed */}
        <TaskColumn
          title="Done"
          tasks={taskGroups.completed}
          onStatusChange={handleStatusChange}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="bottom-nav-grid">
          <button 
            onClick={() => setShowRecurring(true)}
            className="nav-button secondary"
          >
            <span className="text-sm">🔄</span>
            <span className="text-xs">Recurring</span>
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="nav-button secondary"
          >
            <span className="text-sm">📊</span>
            <span className="text-xs">History</span>
          </button>
          <button 
            onClick={() => setShowRolloverConfirm(true)}
            className="nav-button secondary"
          >
            <span className="text-sm">🧹</span>
            <span className="text-xs">Reset Week</span>
          </button>
          <button 
            onClick={() => setShowNewTask(true)}
            className="nav-button primary"
          >
            <span className="text-sm">+</span>
            <span className="text-xs">Add Task</span>
          </button>
        </div>
      </div>

      {/* Task creation modal */}
      <TaskForm isOpen={showNewTask} onClose={() => setShowNewTask(false)} />

      {/* Recurring tasks modal */}
      <RecurringTasksModal isOpen={showRecurring} onClose={() => setShowRecurring(false)} />

      {/* History modal */}
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />

      {/* Week rollover confirmation modal */}
      {showRolloverConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-lg max-w-sm w-full border border-muted">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">🔄 Reset Week?</h3>
              <p className="text-sm text-tertiary mb-4">
                This will move all incomplete tasks back to the backlog. Completed tasks will be archived.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRolloverConfirm(false)}
                  className="flex-1 px-4 py-2 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRolloverWeek}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity"
                >
                  Reset Week
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}