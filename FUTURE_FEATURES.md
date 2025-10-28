# Future Feature Ideas for Kanban Home Scheduler

This document contains product ideas for enhancing user engagement and app stickiness.

## Completed / In Progress
- ✅ Slack daily notifications (9am)
- ✅ Backlog review prompts
- 🚧 **Streak Tracking + Celebration Animations** (Priority 1)
- 🚧 **Weekly Commitment Contract** (Priority 2)
- 🚧 **Enhanced Slack Notifications** (Priority 3)

---

## 🎯 Priority 4+: Future Enhancements

### Weekly Themes & Intentions
**Goal:** Give tasks more meaning by connecting them to a bigger purpose

**Features:**
- At start of week, user sets a theme/intention (freeform text)
  - Examples: "Health & Wellness Week", "Deep Work Week", "Family First", "Reset & Organize"
- Optional: Tag tasks with how they relate to the theme
- Header shows theme with progress indicator
- End-of-week reflection: "How did you do with your theme?"
- Archive themes with completion data

**Technical Implementation:**
- Add `theme` field to weeks table
- Add optional `themeAlignment` field to tasks
- New UI: Theme picker modal at week start
- Theme badge in AppHeader component

---

### Dashboard/Today View
**Goal:** Reduce cognitive load by showing only what matters today

**Features:**
- New default landing page (optional toggle in settings)
- Shows only:
  - Today's scheduled tasks
  - Top 3 committed tasks (if not completed)
  - Current streak
  - Daily motivational quote
  - Weather widget (helps plan outdoor tasks)
- Quick-add button to add tasks directly to today
- "See full week" button to go to kanban view

**Technical Implementation:**
- New route: `/today` or make `/app` default to today view
- New component: `TodayView.tsx`
- Query: `getTodayTasks` (filters by current day)
- Weather API integration (OpenWeather or similar)
- Quote rotation system (hardcoded or API)

---

### Task Analytics & Insights
**Goal:** Show patterns to help users understand their productivity

**Features:**
- **Completion Patterns:**
  - Best day of week for completing tasks
  - Morning vs afternoon completion rates
  - Average tasks completed per week
- **Backlog Health:**
  - Current backlog size
  - Average time tasks spend in backlog
  - Tasks at risk of going stale (>30 days)
- **Streak Analytics:**
  - Longest streak achieved
  - Current streak vs longest
  - Streak calendar view
- **Priority Distribution:**
  - How many high/medium/low tasks completed
  - Tendency to avoid certain priorities

**Technical Implementation:**
- New route: `/analytics`
- New component: `AnalyticsView.tsx`
- New queries: `getAnalytics`, `getStreakHistory`
- Chart library: Recharts or Chart.js
- New table: `analytics` (cached daily rollups for performance)

---

### Task Energy Levels
**Goal:** Help users schedule tasks based on mental/physical energy needed

**Features:**
- Add "energy" field to tasks: 🔋🔋🔋 High, 🔋🔋 Medium, 🔋 Low
- Filter/sort by energy level
- Smart scheduling suggestions:
  - "You have 3 high-energy tasks today - consider moving one to tomorrow"
  - "Morning tip: Tackle your high-energy tasks first"
- Personal energy profile (optional):
  - "I'm most energized in the [morning/afternoon/evening]"
  - Suggest high-energy tasks during peak times

**Technical Implementation:**
- Add `energyLevel` field to tasks schema
- UI: Energy picker in TaskForm (radio buttons or slider)
- Filter in TaskColumn to show energy icons
- Suggestion engine (simple rule-based)

---

### Photo Evidence Feature
**Goal:** Make task completion more tangible and rewarding

**Features:**
- Optional: Attach photo when marking task complete
- Photo gallery view in History
- "Proof" badge on completed tasks with photos
- Weekly photo recap (slideshow style)
- Great for:
  - Cleaning tasks (before/after)
  - Organization projects
  - Home improvements
  - Meal prep

**Technical Implementation:**
- Add `photoUrl` field to tasks
- Image upload to Convex file storage
- Camera integration on mobile (use native input)
- Photo compression before upload
- Gallery view in HistoryModal

---

### Progress Visualizations
**Goal:** Make progress feel real and motivating

**Features:**
- **Weekly Completion Grid:**
  - 7-day grid showing completion counts
  - Color intensity based on completion rate
  - Inspired by GitHub contribution graph
- **Animated Progress Rings:**
  - Daily completion ring (fills as you complete tasks)
  - Weekly completion ring
  - Smooth animations
- **Week-at-a-Glance:**
  - Mini calendar showing which days had tasks
  - Quick visual of your week's shape

**Technical Implementation:**
- New component: `ProgressGrid.tsx`
- SVG-based progress rings with animation
- CSS animations for smooth transitions
- Could use Framer Motion for advanced animations

---

### Smart Suggestions & AI Assistance
**Goal:** Proactive helpfulness that feels like magic

**Features:**
- Pattern recognition:
  - "You usually do X on Sundays - add it now?"
  - "Tasks like this usually take 2 days - schedule for Thursday?"
- Backlog warnings:
  - "You have 15 tasks in backlog - time to review?"
  - "This task has been in backlog for 45 days"
- Streak protection:
  - "You're on a 12-day streak! Don't forget to complete a task today"
  - "You usually complete tasks by 8pm - 3 hours left!"
- Load balancing:
  - "Wednesday has 8 tasks, Thursday has 2 - want to move some?"

**Technical Implementation:**
- Pattern detection queries (analyze historical data)
- Notification/banner system in UI
- Simple rule-based engine (no AI needed initially)
- Could add OpenAI integration later for smarter suggestions

---

### Randomized Encouragement & Personality
**Goal:** Make the app feel alive and supportive, not just functional

**Features:**
- Random messages throughout the app:
  - Loading states: "Fetching your awesome tasks..."
  - Empty states: "Your backlog is empty! Time to dream bigger 🚀"
  - Completion: Various messages - "Boom! 💥", "You're crushing it!", "Another one down!"
- Contextual humor:
  - When backlog is large: "That's... quite a list 😅"
  - When completing last task: "Clear desk, clear mind! 🧘"
  - When on streak: "You're unstoppable! 🔥"
- Customizable personality (settings):
  - Professional / Friendly / Motivational / Funny
  - Or turn off entirely for minimalist experience

**Technical Implementation:**
- Message rotation arrays in constants file
- Random selection function
- Settings toggle for personality type
- Easy to extend with more messages

---

### Social & Accountability Features
**Goal:** External motivation and accountability

**Features:**
- **Accountability Partner:**
  - Invite someone to see your weekly commitments
  - They get notified of your progress
  - Optional: They can cheer you on or send reminders
- **Family/Household Mode:**
  - Shared task board for family
  - Assign tasks to family members
  - Shared recurring tasks (chores)
- **Public Streak Sharing:**
  - Share your streak on social media
  - Generated image with stats
  - "I'm on a 30-day task completion streak!"

**Technical Implementation:**
- Multi-user support in schema
- Sharing/permissions system
- Social sharing: Generate image with node-canvas
- Email/SMS notifications for partners

---

### Task Templates & Quick Add
**Goal:** Reduce friction for common repeated tasks

**Features:**
- Save task templates:
  - "Weekly Grocery Shopping" (with common items in description)
  - "Monthly Budget Review"
  - "Deep Clean Bathroom"
- Quick-add from templates (one tap)
- Share templates with community (optional)
- Smart templates based on your history:
  - "You've created 'Laundry' 20 times - save as template?"

**Technical Implementation:**
- New table: `taskTemplates`
- Template selector in TaskForm
- One-click task creation from template
- Template marketplace (future, optional)

---

### Focus Mode / Do Not Disturb
**Goal:** Help users execute on their tasks

**Features:**
- "Focus Mode" button
- Shows only current task (full screen)
- Timer (Pomodoro style)
- Blocks navigation to other tasks
- Completion triggers confetti + next task

**Technical Implementation:**
- New route: `/focus/:taskId`
- Full-screen modal
- Timer component
- Store focus sessions in analytics

---

### Integrations
**Goal:** Meet users where they already are

**Features:**
- **Calendar Integration:**
  - Sync scheduled tasks to Google Calendar
  - Two-way sync (optional)
  - Task completion marks calendar event as done
- **Email Integration:**
  - Forward emails to create tasks
  - Email digest of weekly tasks
- **Voice Assistant:**
  - "Alexa, add milk to my shopping list"
  - "Hey Siri, what tasks do I have today?"
- **Apple Reminders / Google Tasks:**
  - Import existing tasks
  - One-time or ongoing sync

**Technical Implementation:**
- OAuth flows for external services
- Webhook endpoints for email forwarding
- Calendar API integration (Google Calendar API)
- Voice: IFTTT or Shortcuts integration

---

## Implementation Priority (when ready)

1. **Dashboard/Today View** - Good intermediate feature after top 3
2. **Weekly Themes** - Adds meaning, not too complex
3. **Progress Visualizations** - Quick wins, high visual impact
4. **Smart Suggestions** - Incremental, can build over time
5. **Task Energy Levels** - Nice QoL improvement
6. **Task Analytics** - More involved, but powerful
7. **Photo Evidence** - Fun but requires file storage work
8. **Social Features** - Complex, but could be game-changer
9. **Integrations** - Most complex, save for later

---

## Notes
- Keep the core experience clean and fast
- Make all new features optional/toggleable
- Mobile-first always
- Measure engagement impact of each feature
- User feedback loop is critical
