import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";
import { useUser, UserButton } from "@clerk/clerk-react";
import TaskForm from "./TaskForm";
import TaskEditModal from "./TaskEditModal";
import TaskScheduleModal from "./TaskScheduleModal";
import RecurringTasksModal from "./RecurringTasksModal";
import HistoryModal from "./HistoryModal";
import TaskColumn from "./TaskColumn";
import PWAInstallPrompt, { useAppVisitTracker } from "./PWAInstallPrompt";

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export default function KanbanBoard() {
  const { user } = useUser();
  useAppVisitTracker(); // Track app visits for PWA prompt logic
  
  // Week view state - true for current week, false for next week
  const [viewingCurrentWeek, setViewingCurrentWeek] = useState(true);
  
  // Calculate current and next week IDs
  const getCurrentWeekId = () => {
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = sunday.getDate() - day; // Days to subtract to get to Sunday
    sunday.setDate(diff);
    return sunday.toISOString().split('T')[0];
  };

  const getNextWeekId = () => {
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay();
    const diff = sunday.getDate() - day + 7; // Add 7 days for next week
    sunday.setDate(diff);
    return sunday.toISOString().split('T')[0];
  };

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
  const rolloverWeek = useMutation(api.tasks.rolloverWeek);
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
        console.error("Failed to schedule task:", error);
      }
    }
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
  
  // Calculate week dates for the currently viewing week (Sunday-Saturday)
  const getWeekDates = (weekId: string) => {
    const sunday = new Date(weekId + 'T00:00:00'); // Parse the week ID as Sunday
    
    const dates: Record<string, string> = {};
    dayNames.forEach((dayName, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      dates[dayName] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    return dates;
  };

  // Helper to get a clean week range display (Sun - Sat)
  const getWeekRange = (weekId: string) => {
    const sunday = new Date(weekId + 'T00:00:00');
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    const startStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  };
  
  const weekDates = getWeekDates(viewingWeekId);
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
            <h1 className="text-lg font-semibold text-foreground">
              {user?.firstName ? `${user.firstName}'s Tasks` : 'Home Tasks'}
            </h1>
            <p className="text-xs text-tertiary">
              {todayDate}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
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
              onClick={() => {
                const newExpandedState = !allExpanded;
                setGlobalExpanded(newExpandedState);
                // Reset global trigger after columns update
                setTimeout(() => setGlobalExpanded(null), 100);
              }}
              className="bg-muted/30 text-tertiary hover:bg-muted/50 px-3 py-1.5 rounded-lg text-sm font-medium touch-manipulation transition-colors"
              title={allExpanded ? "Collapse All" : "Expand All"}
            >
              {allExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                  <path d="m356-160-56-56 180-180 180 180-56 56-124-124-124 124Zm124-404L300-744l56-56 124 124 124-124 56 56-180 180Z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                  <path d="M480-80 240-320l57-57 183 183 183-183 57 57L480-80ZM298-584l-58-56 240-240 240 240-58 56-182-182-182 182Z"/>
                </svg>
              )}
            </button>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-surface border border-muted",
                  userButtonPopoverActionButton: "text-foreground hover:bg-secondary",
                }
              }}
              afterSignOutUrl="/signin"
            />
          </div>
        </div>
      </div>

      {/* Backlog column - always visible */}
      <div className="px-4">
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

      {/* Week Tabs */}
      <div className="px-4 py-2 bg-surface border-b border-muted/30">
        <div className="flex bg-muted/20 rounded-lg p-1">
          <button
            onClick={() => setViewingCurrentWeek(true)}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors min-h-[48px] touch-manipulation ${
              viewingCurrentWeek 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-tertiary hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">This Week</div>
              <div className="text-xs opacity-80">
                {getWeekRange(currentWeekId)}
              </div>
            </div>
          </button>
          <button
            onClick={() => setViewingCurrentWeek(false)}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors min-h-[48px] touch-manipulation ${
              !viewingCurrentWeek 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-tertiary hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">Next Week</div>
              <div className="text-xs opacity-80">
                {getWeekRange(nextWeekId)}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Week-specific columns */}
      <div className="kanban-columns">
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
            isToday={today === day}
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
          {viewingCurrentWeek && (
            <button 
              onClick={() => setShowRolloverConfirm(true)}
              className="nav-button secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-250q78 0 134-56t56-134q0-78-56-134t-134-56q-38 0-71 14t-59 38v-62h-60v170h170v-60h-72q17-18 41-29t51-11q54 0 92 38t38 92q0 54-38 92t-92 38q-44 0-77-25.5T356-400h-62q14 65 65.5 107.5T480-250ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-446L526-800H240v640Zm0 0v-640 640Z" /></svg>
              <span className="text-xs">Reset</span>
            </button>
          )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-lg max-w-sm w-full border border-muted">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-250q78 0 134-56t56-134q0-78-56-134t-134-56q-38 0-71 14t-59 38v-62h-60v170h170v-60h-72q17-18 41-29t51-11q54 0 92 38t38 92q0 54-38 92t-92 38q-44 0-77-25.5T356-400h-62q14 65 65.5 107.5T480-250ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-446L526-800H240v640Zm0 0v-640 640Z" /></svg>
                Reset Week?
              </h3>
              <p className="text-sm text-tertiary mb-4">
                This will move all incomplete tasks back to the backlog. Completed tasks will be archived.
              </p>
              <div className="flex space-x-3" style={{paddingBottom: `env(safe-area-inset-bottom, 0px)`}}>
                <button
                  onClick={() => setShowRolloverConfirm(false)}
                  className="flex-1 px-4 py-4 border border-muted text-tertiary rounded-lg font-medium hover:bg-secondary touch-manipulation transition-colors min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRolloverWeek}
                  className="flex-1 px-4 py-4 bg-accent text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
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