import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";
import { useUser } from "@clerk/clerk-react";
import { getCurrentWeekId, getNextWeekId, getWeekDates, getWeekRange } from "../utils/weekUtils";
import { groupTasksByStatus } from "../utils/taskUtils";
import TaskForm from "./TaskForm";
import TaskEditModal from "./TaskEditModal";

import RecurringTasksModal from "./RecurringTasksModal";
import WeeklyReviewModal from "./WeeklyReviewModal";
import TaskColumn from "./TaskColumn";
import AppHeader from "./AppHeader";
import UndoToast from "./UndoToast";
import { usePullToRefresh } from "../hooks/usePullToRefresh";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export default function KanbanBoard() {
  const { user } = useUser();
  const { scrollRef, pullDistance, refreshing } = usePullToRefresh();

  // Week view state - true for current week, false for next week
  const [viewingCurrentWeek, setViewingCurrentWeek] = useState(true);
  
  // Calculate current and next week IDs

  const currentWeekId = getCurrentWeekId();
  const nextWeekId = getNextWeekId();
  const viewingWeekId = viewingCurrentWeek ? currentWeekId : nextWeekId;


  // Fetch data for the appropriate week - use explicit week IDs for consistency
  const currentWeekData = useQuery(api.tasks.getWeekTasks, { weekId: currentWeekId });
  const nextWeekData = useQuery(api.tasks.getWeekTasks, { weekId: nextWeekId });
  const data = viewingCurrentWeek ? currentWeekData : nextWeekData;
  
  
  // Check if user needs weekly review
  const shouldShowWeeklyReview = useQuery(api.weeklyReview.shouldShowWeeklyReview);

  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);

  const updateTask = useMutation(api.tasks.updateTask);
  const completeTask = useMutation(api.tasks.completeTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const restoreTask = useMutation(api.tasks.restoreTask);
  const autoRollover = useMutation(api.weekManager.autoRolloverPreviousWeeks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
  const [columnStates, setColumnStates] = useState<Record<string, boolean>>({});
  const [undoAction, setUndoAction] = useState<{
    type: 'complete' | 'delete';
    taskId: Id<"tasks">;
    previousStatus?: TaskStatus;
    previousWeekId?: string;
  } | null>(null);

  // Calculate if all columns are expanded
  const allExpanded = Object.values(columnStates).length > 0 && Object.values(columnStates).every(expanded => expanded);

  // Memoized callback functions to prevent infinite re-renders
  const handleBacklogExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, backlog: expanded}));
  }, []);

  const handleMondayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, monday: expanded}));
  }, []);

  const handleTuesdayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, tuesday: expanded}));
  }, []);

  const handleWednesdayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, wednesday: expanded}));
  }, []);

  const handleThursdayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, thursday: expanded}));
  }, []);

  const handleFridayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, friday: expanded}));
  }, []);

  const handleSaturdayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, saturday: expanded}));
  }, []);

  const handleSundayExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, sunday: expanded}));
  }, []);

  const handleCompletedExpandedChange = useCallback((expanded: boolean) => {
    setColumnStates(prev => ({...prev, completed: expanded}));
  }, []);

  // Map day names to their corresponding handlers
  const dayHandlers = {
    monday: handleMondayExpandedChange,
    tuesday: handleTuesdayExpandedChange,
    wednesday: handleWednesdayExpandedChange,
    thursday: handleThursdayExpandedChange,
    friday: handleFridayExpandedChange,
    saturday: handleSaturdayExpandedChange,
    sunday: handleSundayExpandedChange,
  };

  // Auto-rollover previous weeks on app load
  useEffect(() => {
    if (data) {
      autoRollover().catch(() => {
        // Silent failure - auto-rollover is non-critical
      });
    }
  }, [data, autoRollover]);
  
  // Show weekly review modal if needed
  useEffect(() => {
    if (shouldShowWeeklyReview === true && data) {
      const timer = setTimeout(() => {
        setShowWeeklyReview(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowWeeklyReview, data]);

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

  const handleComplete = async (taskId: Id<"tasks">) => {
    // Find task to save previous state for undo
    const task = [...(data?.backlogTasks || []), ...(data?.weekTasks || [])].find(t => t._id === taskId);
    try {
      await completeTask({ taskId });
      if (task) {
        setUndoAction({
          type: 'complete',
          taskId,
          previousStatus: task.status as TaskStatus,
          previousWeekId: task.weekId,
        });
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleDelete = async (taskId: Id<"tasks">) => {
    const task = [...(data?.backlogTasks || []), ...(data?.weekTasks || [])].find(t => t._id === taskId);
    try {
      await deleteTask({ taskId });
      if (task) {
        setUndoAction({
          type: 'delete',
          taskId,
          previousStatus: task.status as TaskStatus,
          previousWeekId: task.weekId,
        });
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    try {
      if (undoAction.type === 'complete') {
        await updateTaskStatus({
          taskId: undoAction.taskId,
          newStatus: undoAction.previousStatus || 'backlog',
        });
      } else if (undoAction.type === 'delete') {
        await restoreTask({ taskId: undoAction.taskId });
      }
    } catch (error) {
      // Undo failed silently
    }
    setUndoAction(null);
  };

  const handleEdit = (taskId: Id<"tasks">) => {
    const task = [...data.backlogTasks, ...data.weekTasks].find(t => t._id === taskId);
    if (task) {
      setEditingTask(task);
      setShowEditTask(true);
    }
  };

  const taskGroups = groupTasksByStatus(data.backlogTasks, data.weekTasks);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  
  const weekDates = getWeekDates(viewingWeekId);
  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="app">
      <AppHeader 
        userName={user?.firstName || undefined}
        todayDate={todayDate}
        allExpanded={allExpanded}
        onToggleExpandAll={() => {
          const newExpandedState = !allExpanded;
          setGlobalExpanded(newExpandedState);
          // Reset global trigger after columns update
          setTimeout(() => setGlobalExpanded(null), 100);
        }}
      />

      {/* Main scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{paddingBottom: `calc(6rem + env(safe-area-inset-bottom, 0px))`}}>
        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center overflow-hidden transition-opacity"
            style={{ height: pullDistance, opacity: Math.min(pullDistance / 80, 1) }}
          >
            <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        )}
        {/* Backlog column - always visible */}
        <div className="px-4 py-3">
          <TaskColumn
            title="Backlog"
            tasks={taskGroups.backlog}
            onStatusChange={handleStatusChange}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}

            isBacklog={true}
            collapsible={true}
            globalExpanded={globalExpanded}
            onExpandedChange={handleBacklogExpandedChange}
          />
        </div>

        {/* Week Tabs with enclosed content */}
        <div className="px-4">
          <div className="bg-surface border border-muted rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-muted/50">
            <button
              onClick={() => setViewingCurrentWeek(true)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative touch-manipulation ${
                viewingCurrentWeek 
                  ? 'text-primary bg-surface' 
                  : 'text-tertiary hover:text-foreground bg-muted/20'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">This Week</div>
                <div className="text-xs opacity-70">
                  {getWeekRange(currentWeekId)}
                </div>
              </div>
              {viewingCurrentWeek && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
            <button
              onClick={() => setViewingCurrentWeek(false)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative touch-manipulation ${
                !viewingCurrentWeek 
                  ? 'text-primary bg-surface' 
                  : 'text-tertiary hover:text-foreground bg-muted/20'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">Next Week</div>
                <div className="text-xs opacity-70">
                  {getWeekRange(nextWeekId)}
                </div>
              </div>
              {!viewingCurrentWeek && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
          </div>

          {/* Tab Content - Week-specific columns */}
          <div className="kanban-columns bg-surface">
        {/* Week days */}
        {dayNames.map((day) => (
          <TaskColumn
            key={day}
            title={day.charAt(0).toUpperCase() + day.slice(1)}
            tasks={taskGroups[day]}
            onStatusChange={handleStatusChange}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}

            isToday={viewingCurrentWeek && today === day}
            date={weekDates[day]}
            collapsible={true}
            globalExpanded={globalExpanded}
            onExpandedChange={dayHandlers[day as keyof typeof dayHandlers]}
          />
        ))}

        {/* Completed - only show for current week */}
        {viewingCurrentWeek && (
          <TaskColumn
            title="Done"
            tasks={taskGroups.completed}
            onStatusChange={handleStatusChange}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}

            isCompleted={true}
            collapsible={true}
            globalExpanded={globalExpanded}
            onExpandedChange={handleCompletedExpandedChange}
          />
        )}
          </div>
        </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={() => setShowRecurring(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 text-tertiary hover:bg-muted/50 touch-manipulation transition-colors min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
              <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/>
            </svg>
            <span className="text-sm font-medium">Recurring</span>
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white touch-manipulation transition-opacity hover:opacity-90 min-h-[44px]"
          >
            <span className="text-base font-medium">+</span>
            <span className="text-sm font-medium">Add Task</span>
          </button>
        </div>
      </div>

      {/* Task creation modal */}
      <TaskForm 
        isOpen={showNewTask} 
        onClose={() => setShowNewTask(false)}
        currentWeekId={currentWeekId}
        nextWeekId={nextWeekId}
        viewingCurrentWeek={viewingCurrentWeek}
      />

      {/* Task edit modal */}
      <TaskEditModal 
        isOpen={showEditTask} 
        task={editingTask}
        onClose={() => {
          setShowEditTask(false);
          setEditingTask(null);
        }} 
      />

      {/* Recurring tasks modal */}
      <RecurringTasksModal 
        isOpen={showRecurring} 
        onClose={() => setShowRecurring(false)}
        currentWeekId={currentWeekId}
        nextWeekId={nextWeekId}
      />

      {/* Weekly review modal */}
      <WeeklyReviewModal
        isOpen={showWeeklyReview}
        onClose={() => setShowWeeklyReview(false)}
        currentWeekId={currentWeekId}
        nextWeekId={nextWeekId}
      />

      {/* Undo Toast */}
      <UndoToast
        action={undoAction}
        onUndo={handleUndo}
        onDismiss={() => setUndoAction(null)}
      />
    </div>
  );
}