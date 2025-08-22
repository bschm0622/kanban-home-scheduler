import type { Task, TaskStatus } from "../types";

// Group tasks by their status with priority sorting
export function groupTasksByStatus(backlogTasks: Task[], weekTasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    backlog: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
    completed: []
  };

  // Priority sorting function: high -> medium -> low
  const sortByPriority = (tasks: Task[]) => {
    return tasks.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  // Add backlog tasks with priority sorting
  groups.backlog = sortByPriority([...backlogTasks]);

  // Add week tasks to their respective days with priority sorting
  weekTasks.forEach(task => {
    if (groups[task.status]) {
      groups[task.status].push(task);
    }
  });

  // Sort each day's tasks by priority
  Object.keys(groups).forEach(status => {
    if (status !== 'backlog') { // backlog already sorted above
      groups[status as TaskStatus] = sortByPriority(groups[status as TaskStatus]);
    }
  });

  return groups;
}