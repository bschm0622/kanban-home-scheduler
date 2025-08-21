# Kanban Home Scheduler

A personal task management application built with React, TypeScript, and Convex that helps you organize your week using a kanban-style board.

## ✨ Features

- **Weekly Kanban Board**: Organize tasks across Monday-Sunday columns
- **Task Priorities**: Low, medium, and high priority levels with color coding
- **Recurring Tasks**: Set up tasks that automatically generate each week
- **Authentication**: Secure login with Clerk
- **Task History**: View completed tasks and weekly performance stats
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live synchronization across devices

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Astro
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS with custom kanban theme
- **Icons**: Material Design SVG icons

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account
- Clerk account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kanban-home-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example env file
cp .env.example .env.local

# Configure your environment variables:
# - Convex deployment URL
# - Clerk publishable key
```

4. Set up Convex:
```bash
npx convex dev
```

5. Configure Clerk authentication in your Convex dashboard

6. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:4321` to see the application.

## 📱 Usage

### Managing Tasks

- **Add Tasks**: Click the + button to create new tasks with title, description, and priority
- **Move Tasks**: Drag tasks between days or use the task actions menu
- **Complete Tasks**: Click the checkmark to mark tasks as done
- **Delete Tasks**: Use the delete button in task actions

### Recurring Tasks

- **Create**: Add tasks that should repeat weekly (dishes, laundry, etc.)
- **Generate**: Select which recurring tasks to add to your current week
- **Select All**: Quickly select/deselect all recurring tasks
- **Manage**: Edit or delete recurring task templates

### Week Management

- **Navigation**: Use arrow buttons to switch between weeks
- **History**: View past weeks and completion statistics
- **Auto-archive**: Completed weeks are automatically saved to history

## 🗂️ Project Structure

```
src/
├── components/           # React components
│   ├── KanbanBoard.tsx  # Main kanban interface
│   ├── TaskCard.tsx     # Individual task component
│   ├── RecurringTasksModal.tsx # Recurring task management
│   └── HistoryModal.tsx # Week history viewer
├── styles/              # CSS and styling
├── types/               # TypeScript type definitions
└── pages/               # Astro pages
    └── index.astro      # Main application page

convex/
├── tasks.ts            # Task database operations
├── recurringTasks.ts   # Recurring task logic
├── history.ts          # Week archiving and stats
└── schema.ts           # Database schema definitions
```

## 🎨 Customization

The app uses a custom CSS theme with CSS variables for easy customization:

- Colors: Defined in `src/styles/global.css`
- Task priorities: Color-coded system (green/yellow/red)
- Dark mode: Automatic based on system preference
- Mobile responsive: Optimized touch targets and layouts

## 🔧 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npx convex dev` | Start Convex development |
| `npx convex deploy` | Deploy Convex functions |

## 🔐 Authentication & Security

- User authentication via Clerk
- Row-level security in Convex
- All database operations scoped to authenticated users
- No sensitive data stored client-side

## 📊 Performance

- Real-time updates via Convex subscriptions
- Optimistic UI updates for better UX
- Efficient re-renders with React best practices
- Lazy loading of historical data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build/)
- Real-time backend by [Convex](https://convex.dev/)
- Authentication by [Clerk](https://clerk.com/)
- Icons by [Material Design](https://fonts.google.com/icons)