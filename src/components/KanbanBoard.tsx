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
import TaskScheduleModal from "./TaskScheduleModal";
import RecurringTasksModal from "./RecurringTasksModal";
import HistoryModal from "./HistoryModal";
import TaskColumn from "./TaskColumn";
import PWAInstallPrompt, { useAppVisitTracker } from "./PWAInstallPrompt";
import AppHeader from "./AppHeader";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export default function KanbanBoard() {
  const { user } = useUser();
  useAppVisitTracker(); // Track app visits for PWA prompt logic
  
  // Week view state - true for current week, false for next week
  const [viewingCurrentWeek, setViewingCurrentWeek] = useState(true);
  
  // Calculate current and next week IDs

  const currentWeekId = getCurrentWeekId();
  const nextWeekId = getNextWeekId();
  const viewingWeekId = viewingCurrentWeek ? currentWeekId : nextWeekId;


  // Fetch data for the appropriate week
  const currentWeekData = useQuery(api.tasks.getCurrentWeekTasks);
  const nextWeekData = useQuery(api.tasks.getWeekTasks, { weekId: nextWeekId });
  const data = viewingCurrentWeek ? currentWeekData : nextWeekData;

  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const scheduleTaskToWeek = useMutation(api.tasks.scheduleTaskToWeek);
  const updateTask = useMutation(api.tasks.updateTask);
  const completeTask = useMutation(api.tasks.completeTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const resetWeek = useMutation(api.tasks.resetWeek);
  const autoRollover = useMutation(api.weekManager.autoRolloverPreviousWeeks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showScheduleTask, setShowScheduleTask] = useState(false);
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
  const [columnStates, setColumnStates] = useState<Record<string, boolean>>({});

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

  const handleEdit = (taskId: Id<"tasks">) => {
    const task = [...data.backlogTasks, ...data.weekTasks].find(t => t._id === taskId);
    if (task) {
      setEditingTask(task);
      setShowEditTask(true);
    }
  };

  const handleSchedule = (taskId: Id<"tasks">) => {
    const task = [...data.backlogTasks, ...data.weekTasks].find(t => t._id === taskId);
    if (task) {
      setSchedulingTask(task);
      setShowScheduleTask(true);
    }
  };

  const handleScheduleConfirm = async (newStatus: TaskStatus, weekId: string) => {
    if (schedulingTask) {
      try {
        await scheduleTaskToWeek({ 
          taskId: schedulingTask._id, 
          newStatus,
          weekId: weekId || undefined
        });
        setShowScheduleTask(false);
        setSchedulingTask(null);
      } catch (error) {
        // Task scheduling failed - user will see stale UI state
      }
    }
  };

  const handleRolloverWeek = async () => {
    try {
      await resetWeek({ 
        weekId: viewingWeekId 
      });
      setShowRolloverConfirm(false);
      // Week reset successful - UI will update automatically
    } catch (error) {
      // Week reset failed - user will see stale UI state
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
      <div className="flex-1 overflow-y-auto" style={{paddingBottom: `calc(9rem + env(safe-area-inset-bottom, 0px))`}}>
        {/* Backlog column - always visible */}
        <div className="px-4 py-3">
          <TaskColumn
            title="Backlog"
            tasks={taskGroups.backlog}
            onStatusChange={handleStatusChange}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSchedule={handleSchedule}
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
            onSchedule={handleSchedule}
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
            onSchedule={handleSchedule}
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
        <div className="bottom-nav-grid">
          <button 
            onClick={() => setShowRecurring(true)}
            className="nav-button secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/>
            </svg>
            <span className="text-xs">Recurring</span>
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="nav-button secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z"/>
            </svg>
            <span className="text-xs">History</span>
          </button>
          <button 
            onClick={() => setShowRolloverConfirm(true)}
            className="nav-button secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-250q78 0 134-56t56-134q0-78-56-134t-134-56q-38 0-71 14t-59 38v-62h-60v170h170v-60h-72q17-18 41-29t51-11q54 0 92 38t38 92q0 54-38 92t-92 38q-44 0-77-25.5T356-400h-62q14 65 65.5 107.5T480-250ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-446L526-800H240v640Zm0 0v-640 640Z" /></svg>
            <span className="text-xs">Reset</span>
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

      {/* Task schedule modal */}
      <TaskScheduleModal 
        isOpen={showScheduleTask} 
        currentStatus={schedulingTask?.status || "backlog"}
        currentTaskWeekId={schedulingTask?.weekId}
        currentWeekId={currentWeekId}
        nextWeekId={nextWeekId}
        taskTitle={schedulingTask?.title}
        onSchedule={handleScheduleConfirm}
        onClose={() => {
          setShowScheduleTask(false);
          setSchedulingTask(null);
        }} 
      />

      {/* Recurring tasks modal */}
      <RecurringTasksModal 
        isOpen={showRecurring} 
        onClose={() => setShowRecurring(false)}
        currentWeekId={currentWeekId}
        nextWeekId={nextWeekId}
      />

      {/* History modal */}
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />

      {/* Week rollover confirmation modal */}
      {showRolloverConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRolloverConfirm(false);
            }
          }}
        >
          <div className="bg-surface w-full sm:w-96 sm:rounded-lg rounded-t-lg border border-muted">
            <div className="p-4 border-b border-muted">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-250q78 0 134-56t56-134q0-78-56-134t-134-56q-38 0-71 14t-59 38v-62h-60v170h170v-60h-72q17-18 41-29t51-11q54 0 92 38t38 92q0 54-38 92t-92 38q-44 0-77-25.5T356-400h-62q14 65 65.5 107.5T480-250ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-446L526-800H240v640Zm0 0v-640 640Z" /></svg>
                  Reset {viewingCurrentWeek ? 'This' : 'Next'} Week?
                </h2>
                <button
                  onClick={() => setShowRolloverConfirm(false)}
                  className="text-tertiary hover:text-foreground text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-tertiary mt-2">
                This will move all incomplete tasks from {viewingCurrentWeek ? 'this week' : 'next week'} back to the backlog. Completed tasks will be archived.
              </p>
            </div>

            <div className="p-4">
              <div className="flex space-x-3" style={{paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`}}>
                <button
                  onClick={() => setShowRolloverConfirm(false)}
                  className="flex-1 px-4 py-3 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRolloverWeek}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
                >
                  Reset Week
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}