# Schmidt Home Tasks

A mobile-first kanban-style task manager for organizing your week. Built as a personal PWA with real-time sync, Slack notifications, and weekly planning workflows.

**Live at [home.beckyschmidt.me](https://home.beckyschmidt.me)**

## Tech Stack

- **Frontend**: Astro + React 18 + TypeScript
- **Backend**: Convex (real-time database + scheduled functions)
- **Auth**: Clerk
- **Styling**: Tailwind CSS v4
- **Notifications**: Slack Incoming Webhooks
- **PWA**: @vite-pwa/astro with Workbox caching

## Features

### Kanban Board
- Weekly view with Sunday-Saturday columns plus backlog
- Collapsible day columns with task counts (today auto-expands)
- Toggle between current week and next week
- Pull-to-refresh on mobile
- Completed tasks column

### Task Management
- Create tasks with title, description, and priority (low/medium/high)
- Schedule tasks to any day of the current or next week
- Set optional reminder times (triggers Slack notification at that time)
- Swipe right to complete, swipe left to edit (mobile)
- Soft-delete with 3-second undo toast
- Priority color coding on task cards (green/yellow/red left border)
- Confetti animation on completion

### Recurring Tasks
- Create weekly or monthly recurring task templates
- Set preferred day and optional reminder time
- Auto-generates instances every Monday at 4 AM EST
- Manual bulk generation for current or next week
- Edit, activate/deactivate, or delete templates

### Weekly Review
- Prompted on Saturday/Sunday (once per week)
- Triage oldest backlog tasks: schedule to a day, delete, or skip
- Dismissable and won't nag again once reviewed

### Slack Notifications
- **Morning Briefing** (daily, 9 AM EST): Today's tasks sorted by time, yesterday's unfinished items
- **Task Reminders** (per-task): Fires at the scheduled due time via `scheduler.runAt()`
- **Weekly Recap** (Sunday, 9 PM EST): Tasks completed vs total

### Automated Jobs (Cron)
- Auto-rollover: Monday 3 AM EST, moves incomplete tasks from past weeks to backlog
- Auto-generate recurring tasks: Monday 4 AM EST
- Cleanup: Daily 3 AM EST, permanently deletes soft-deleted tasks older than 24 hours

### Mobile & PWA
- Installable PWA with standalone display and offline caching
- Touch-optimized with 44px minimum tap targets
- Safe area inset handling for notched devices
- Dark/light theme with system preference detection
- 100dvh viewport handling for mobile browsers

## Getting Started

### Prerequisites
- Node.js 18+
- Convex account
- Clerk account

### Setup

```bash
npm install
cp .env.example .env.local
# Configure: PUBLIC_CONVEX_URL, Clerk keys, SLACK_WEBHOOK_URL
```

### Development

Run both in separate terminals:

```bash
npm run dev          # Astro dev server at localhost:4321
npx convex dev      # Convex backend
```

### Production

```bash
npm run build        # Build to ./dist/
npx convex deploy    # Deploy Convex functions
```

## Project Structure

```
src/
  components/
    KanbanBoard.tsx          # Main board with columns, nav, week switching
    TaskCard.tsx             # Individual task with swipe gestures
    TaskForm.tsx             # New task creation modal
    TaskEditModal.tsx        # Edit task details + reschedule
    RecurringTasksModal.tsx  # Manage recurring task templates
    RecurringTaskEditModal.tsx
    WeeklyReviewModal.tsx    # Saturday/Sunday weekly planning flow
    TimePicker.tsx           # 12-hour time picker with AM/PM
    ConfettiEffect.tsx       # Completion celebration
  layouts/
    Layout.astro             # Base HTML layout
  styles/
    global.css               # Theme variables, kanban styles, dark mode
  pages/
    index.astro              # Main app page

convex/
  schema.ts                  # Database schema (tasks, recurringTasks, weeks, userSettings)
  tasks.ts                   # Task CRUD + reminder scheduling
  recurringTasks.ts          # Recurring task templates + generation
  weekManager.ts             # Auto-rollover logic
  slackNotifications.ts      # All Slack messages (briefing, reminders, recap)
  crons.ts                   # Scheduled job definitions
  lib/timezone.ts            # EST timezone utilities
```

## Auth & Security

- Clerk authentication required for all operations
- Row-level security: all queries/mutations scoped to `userId`
- Slack notifications filtered to allowed user IDs
