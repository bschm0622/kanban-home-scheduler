# Implementation Plan: Top 3 Features

## Overview
Building the three highest-impact engagement features:
1. **Streak Tracking + Celebration Animations**
2. **Weekly Planning & Review (replaces backlog review + adds commitments)**
3. **Enhanced Slack Notifications**

---

## Feature 1: Streak Tracking + Celebration Animations

### Backend Changes

#### Schema Updates (`convex/schema.ts`)
```typescript
streaks: defineTable({
  userId: v.string(),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastCompletionDate: v.string(), // YYYY-MM-DD format
  streakStartDate: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"])
```

#### New Convex Functions (`convex/streaks.ts`)
- `getStreak(userId)` - Query user's current streak data
- `updateStreak(userId)` - Called when task is completed
  - Logic: Check if first completion today
  - If last completion was yesterday → increment
  - If last completion was today → no change
  - If 2+ days ago → reset to 1
  - Update longestStreak if needed
- `getStreakCalendar(userId, month)` - Get completion history for calendar view

#### Update Task Completion (`convex/tasks.ts`)
- In `completeTask` mutation, add call to `updateStreak`
- Return streak data so UI can show milestone celebrations

### Frontend Changes

#### 1. Streak Display in Header (`src/components/AppHeader.tsx`)
- Add streak badge next to user name
- Show: "🔥 12 day streak"
- Clickable to show streak details modal (future)

#### 2. Celebration Animations (`src/components/TaskCard.tsx`)
- Install: `npm install canvas-confetti`
- On complete button click:
  - Trigger confetti animation
  - Haptic feedback (if supported): `navigator.vibrate(10)`
  - Smooth fade-out animation for card
- Different confetti colors by priority:
  - High = red, Medium = yellow, Low = green

#### 3. Milestone Celebrations (new component: `src/components/MilestoneModal.tsx`)
- Full-screen modal for streak milestones (7, 14, 30, 60, 100+ days)
- Large confetti burst
- Message: "🔥 30 Day Streak! You're unstoppable!"
- Close button

#### 4. Hook for Streak Updates (`src/hooks/useStreakTracking.ts`)
- Custom hook to fetch and manage streak state
- Provides: `{ currentStreak, longestStreak, checkMilestone }`

### Files to Create
- `convex/streaks.ts` - Streak logic
- `src/components/MilestoneModal.tsx` - Milestone celebration
- `src/hooks/useStreakTracking.ts` - Streak state management

### Files to Modify
- `convex/schema.ts` - Add streaks table
- `convex/tasks.ts` - Call updateStreak on completion
- `src/components/AppHeader.tsx` - Display streak badge
- `src/components/TaskCard.tsx` - Add confetti animation
- `src/components/KanbanBoard.tsx` - Wire up milestone modal
- `package.json` - Add canvas-confetti dependency

---

## Feature 2: Weekly Planning & Review

### Backend Changes

#### Schema Updates (`convex/schema.ts`)
```typescript
// Update weeks table
weeks: defineTable({
  // ... existing fields
  commitmentTaskIds: v.optional(v.array(v.id("tasks"))),
  weekTheme: v.optional(v.string()),
  reflectionNote: v.optional(v.string()),
  reviewCompletedAt: v.optional(v.number()),
})

// Update tasks table
tasks: defineTable({
  // ... existing fields
  isCommitment: v.optional(v.boolean()),
  commitmentWeekId: v.optional(v.string()),
})

// Update userSettings table
userSettings: defineTable({
  // ... existing fields
  lastWeekReviewWeekId: v.optional(v.string()),
})
```

#### New/Updated Convex Functions

**`convex/weeklyReview.ts`** (new file)
- `getWeeklySummary(weekId)` - Get completion stats for the week
  - Total tasks, completed tasks, completion rate
  - Commitment completion stats
  - Streak info
- `shouldShowWeeklyReview()` - Determines if user should see review
  - Check if current week is Sat/Sun
  - Check if already reviewed this week
  - Return boolean + summary data
- `markWeekReviewed(weekId, reflectionNote?)` - Mark review as complete
- `setWeekCommitments(weekId, taskIds[], theme?)` - Save commitments

**Update `convex/tasks.ts`**
- `setTaskCommitment(taskId, isCommitment, weekId)` - Mark task as commitment
- Update `getWeekTasks` to sort commitments to top

### Frontend Changes

#### 1. Replace BacklogReviewModal with WeeklyReviewModal
**New component: `src/components/WeeklyReviewModal.tsx`**

Three-step wizard:
- **Step 1: Week Summary & Reflection**
  - Show stats (tasks completed, commitment rate, streak)
  - Optional reflection text box
  - Button: "Next: Clean Up Backlog"

- **Step 2: Backlog Cleanup** (reuse existing logic)
  - Show 5-10 oldest backlog tasks
  - Schedule / Delete / Keep actions
  - Progress counter
  - Button: "Next: Plan Next Week"

- **Step 3: Set Commitments**
  - Show backlog tasks + scheduled tasks for next week
  - Checkbox selection (3-5 recommended)
  - Optional theme input
  - Button: "Set Commitments"

**UI Components:**
- Progress indicator (Step 1/3, 2/3, 3/3)
- Can navigate back/forward
- Can skip entire flow
- Celebration when commitments are set

#### 2. Update Task Display for Commitments
**Modify `src/components/TaskCard.tsx`**
- If task.isCommitment, show pin icon 📌
- Add "Commitment" badge
- Slightly different styling (gold border?)

**Modify `src/components/TaskColumn.tsx`**
- Sort commitment tasks to top of column
- Optional: Collapsible "Commitments" section

#### 3. Commitment Counter in Header
**Modify `src/components/AppHeader.tsx`**
- Below streak, show: "Commitments: 3/5 ✅"
- Only show if user has set commitments for current week

#### 4. Update Trigger Logic
**Modify `src/components/KanbanBoard.tsx`**
- Replace `shouldShowBacklogReview` with `shouldShowWeeklyReview`
- Update state: `showBacklogReview` → `showWeeklyReview`
- Wire up new modal

### Files to Create
- `convex/weeklyReview.ts` - Review logic
- `src/components/WeeklyReviewModal.tsx` - Main review flow
- `src/components/CommitmentBadge.tsx` - Reusable badge component

### Files to Modify
- `convex/schema.ts` - Update weeks & tasks tables
- `convex/tasks.ts` - Add commitment methods
- `convex/userSettings.ts` - Update review tracking
- `src/components/KanbanBoard.tsx` - Wire up new modal
- `src/components/AppHeader.tsx` - Show commitment counter
- `src/components/TaskCard.tsx` - Show commitment badge
- `src/components/TaskColumn.tsx` - Sort commitments to top

### Files to Delete
- `src/components/BacklogReviewModal.tsx` - Replaced by WeeklyReviewModal

---

## Feature 3: Enhanced Slack Notifications

### Backend Changes

#### New Convex Functions (`convex/slackNotifications.ts`)

**Enhance existing:**
- `sendScheduledDailyTasks` - Add more context
  - Include commitment tasks highlighted
  - Add streak info
  - Add encouragement message

**Add new functions:**
- `sendEndOfDaySummary` - Evening summary
  - Tasks completed today
  - Remaining tasks (especially commitments)
  - Streak status
  - Gentle encouragement

- `sendStreakAlert` - Protect streak
  - Only sends if no tasks completed today
  - Suggests quick tasks
  - Urgency but supportive tone

- `sendWeeklyRecap` - Sunday evening summary
  - Week completion stats
  - Commitment completion rate
  - Streak milestone if hit
  - Comparison to last week
  - Encouragement for next week

#### Update Cron Jobs (`convex/crons.ts`)
```typescript
// Keep existing 9am notification
crons.daily("send daily tasks to slack", ...)

// Add new crons
crons.daily("end of day summary",
  { hourUTC: 0, minuteUTC: 0 }, // 8pm EST
  internal.slackNotifications.sendEndOfDaySummary
)

crons.daily("streak protection alert",
  { hourUTC: 23, minuteUTC: 0 }, // 7pm EST
  internal.slackNotifications.sendStreakAlert
)

crons.weekly("weekly recap",
  { hourUTC: 1, minuteUTC: 0, dayOfWeek: 0 }, // Sunday 9pm EST
  internal.slackNotifications.sendWeeklyRecap
)
```

### Message Formats

#### Enhanced Morning Message (9am)
```
☀️ Good morning! Here's your Tuesday (Dec 10)

🎯 Commitments (2)
  📌 Finish quarterly report [HIGH]
  📌 Call mom [MEDIUM]

📋 Other Tasks (3)
  • Grocery shopping [LOW]
  • Clean garage [MEDIUM]
  • Review budget [LOW]

🔥 Streak: 12 days - keep it going!

👉 Open app: [link]
```

#### End of Day Summary (8pm)
```
🌙 Tuesday Wrap-Up

✅ Completed: 4/5 tasks (80%)
  ✓ Finish quarterly report [Commitment]
  ✓ Grocery shopping
  ✓ Clean garage
  ✓ Review budget

⏳ Still open:
  • Call mom [Commitment - 5 min]

🔥 Streak: 12 days (complete 1 more to keep it!)

You're so close! 💪
```

#### Streak Alert (7pm, only if needed)
```
⚠️ Streak Alert! 🔥

You're on a 45-day streak, but haven't completed any tasks today.

Quick wins:
  • Call mom [5 min]
  • Check email [10 min]

Don't break the chain! ⛓️
```

#### Weekly Recap (Sunday 9pm)
```
📊 Week of Dec 3-9: Great work! 🎉

✅ Completed: 18/25 tasks (72%)
🎯 Commitments: 4/5 (80%)
🔥 18-day streak maintained!

🏆 Highlights:
  • Completed all commitments
  • Best day: Thursday (6 tasks)

📈 vs last week: +15% completion

Ready for next week? 👉 [link]
```

### Files to Modify
- `convex/slackNotifications.ts` - Add new notification functions
- `convex/crons.ts` - Add new cron schedules

---

## Implementation Order

### Week 1: Streaks Foundation
1. ✅ Create streaks schema
2. ✅ Build streak tracking logic (convex/streaks.ts)
3. ✅ Update task completion to track streaks
4. ✅ Display streak badge in AppHeader
5. ✅ Add confetti animation to task completion
6. ✅ Test streak logic (increment, reset, etc.)

### Week 2: Streaks Polish + Weekly Review Backend
7. ✅ Milestone detection & celebration modal
8. ✅ Haptic feedback on mobile
9. ✅ Update schema for commitments & review
10. ✅ Build weeklyReview.ts functions
11. ✅ Build commitment logic in tasks.ts

### Week 3: Weekly Review UI
12. ✅ Create WeeklyReviewModal (3-step wizard)
13. ✅ Step 1: Week summary & reflection
14. ✅ Step 2: Backlog cleanup (reuse existing)
15. ✅ Step 3: Commitment selection
16. ✅ Update KanbanBoard to trigger new modal
17. ✅ Display commitment badges on tasks
18. ✅ Show commitment counter in header

### Week 4: Slack Enhancements
19. ✅ Enhance morning notification with commitments + streak
20. ✅ Build end-of-day summary notification
21. ✅ Build streak protection alert
22. ✅ Build weekly recap notification
23. ✅ Add new cron jobs
24. ✅ Test all notifications

---

## Testing Checklist

### Streaks
- [ ] First task completion creates streak = 1
- [ ] Completing task same day doesn't increment
- [ ] Completing task next day increments to 2
- [ ] Skipping a day resets to 1
- [ ] Longest streak updates correctly
- [ ] Milestone modal appears at 7, 14, 30 days
- [ ] Confetti triggers on task complete
- [ ] Streak badge shows in header

### Weekly Review
- [ ] Modal appears on Saturday/Sunday
- [ ] Step 1 shows accurate stats
- [ ] Step 2 backlog cleanup works
- [ ] Step 3 commitment selection works
- [ ] Can navigate back/forward
- [ ] Can skip entire flow
- [ ] Review only shows once per week
- [ ] Commitments show badge on tasks
- [ ] Commitments sort to top of columns
- [ ] Commitment counter shows in header

### Slack Notifications
- [ ] Morning notification includes commitments
- [ ] Morning notification shows streak
- [ ] End-of-day summary accurate
- [ ] Streak alert only sends if no completions
- [ ] Weekly recap shows correct stats
- [ ] All notifications properly formatted
- [ ] Links work correctly

---

## Nice-to-Haves (Future)
- Settings page to toggle features on/off
- Configurable notification times
- Streak calendar visualization
- Share milestone achievements
- Commitment analytics (completion rate over time)
- Multiple commitment sets (personal, work, health)
