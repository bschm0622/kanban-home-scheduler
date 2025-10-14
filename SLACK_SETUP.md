# Slack Integration Setup

This app can send daily task summaries to Slack using webhooks.

## Setup Instructions

### 1. Create a Slack Incoming Webhook

1. Go to your Slack workspace
2. Navigate to https://api.slack.com/apps
3. Click "Create New App" → "From scratch"
4. Name your app (e.g., "Kanban Task Scheduler") and select your workspace
5. In the app settings, go to "Incoming Webhooks"
6. Activate Incoming Webhooks
7. Click "Add New Webhook to Workspace"
8. Select the channel where you want to receive notifications
9. Copy the webhook URL (looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### 2. Configure Your Environment

Add the webhook URL to your `.env.local` file:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Important:** Restart your Convex development server after adding the environment variable:

```bash
# Stop the current process (Ctrl+C) then run:
npx convex dev
```

### 3. Test the Integration

You can test the Slack integration in two ways:

#### Option A: Using the Convex Dashboard

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to your project
3. Go to "Functions" tab
4. Find `slackNotifications:sendDailyTasksToSlack`
5. Click "Run" and execute with no arguments (or provide a test webhook URL)

#### Option B: From Your Application

Call the mutation from your frontend:

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function TestSlackButton() {
  const sendTasks = useMutation(api.slackNotifications.sendDailyTasksToSlack);

  return (
    <button onClick={() => sendTasks({})}>
      Test Slack Notification
    </button>
  );
}
```

#### Option C: Test a Specific Day

```typescript
const sendTasks = useMutation(api.slackNotifications.sendTasksForDay);

// Send Monday's tasks
sendTasks({ dayName: "monday" });
```

## Features

### Daily Automated Notifications

The system automatically sends task summaries every day at **7:00 AM EST** (11:00 UTC).

**To change the notification time:**

Edit the `hourUTC` and `minuteUTC` values in [convex/slackNotifications.ts](convex/slackNotifications.ts):

```typescript
crons.daily(
  "send daily tasks to slack",
  { hourUTC: 11, minuteUTC: 0 }, // Adjust these values
  async (ctx) => {
    // ...
  }
);
```

**Timezone conversion examples:**
- 7:00 AM EST (UTC-4) = 11:00 UTC
- 7:00 AM PST (UTC-7) = 14:00 UTC
- 8:00 AM EST (UTC-4) = 12:00 UTC
- 9:00 AM EST (UTC-4) = 13:00 UTC

### Message Format

The Slack message includes:

- 📋 Header with the day and user name
- Task count breakdown by priority (high/medium/low)
- Tasks organized by priority with emoji indicators:
  - 🔴 High Priority
  - 🟡 Medium Priority
  - 🟢 Low Priority
- Task descriptions (if available)

### Per-User vs Combined Notifications

Currently, the scheduled cron job sends **one combined message** with all users' tasks.

To send individual messages per user, modify the cron job in [convex/slackNotifications.ts](convex/slackNotifications.ts:229-267) to iterate over `tasksByUser` and send separate messages.

## Troubleshooting

### "SLACK_WEBHOOK_URL not configured" error

1. Verify the environment variable is in `.env.local`
2. Restart `npx convex dev`
3. Check that the variable name is spelled correctly

### Slack returns 400 or 404 error

- Verify your webhook URL is correct
- Make sure the webhook hasn't been deleted in Slack
- Check that you copied the entire URL including the protocol (`https://`)

### Messages not sending on schedule

- Verify the cron job is registered by checking the Convex dashboard
- Check the timezone calculation matches your expected time
- Look for error logs in the Convex dashboard Functions tab

## Manual Functions

| Function | Purpose |
|----------|---------|
| `sendDailyTasksToSlack` | Send today's tasks for the authenticated user |
| `sendTasksForDay` | Send tasks for a specific day (sunday-saturday) |

Both functions accept an optional `webhookUrl` parameter to override the environment variable for testing.
