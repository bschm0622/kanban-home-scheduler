import { UserButton } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getCurrentWeekId } from "../utils/weekUtils";

interface AppHeaderProps {
  userName?: string;
  todayDate: string;
  allExpanded: boolean;
  onToggleExpandAll: () => void;
}

export default function AppHeader({ userName, todayDate, allExpanded, onToggleExpandAll }: AppHeaderProps) {
  const streakData = useQuery(api.streaks.getStreak);
  const currentWeekId = getCurrentWeekId();
  const commitments = useQuery(api.weeklyReview.getWeekCommitments, { weekId: currentWeekId });

  return (
    <div className="app-header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {userName ? `${userName}'s Tasks` : 'Home Tasks'}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-tertiary">
              {todayDate}
            </p>
            {streakData && streakData.currentStreak > 0 && (
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                🔥 {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
              </span>
            )}
            {commitments && commitments.totalCount > 0 && (
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                🎯 {commitments.completedCount}/{commitments.totalCount}
              </span>
            )}
          </div>
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
                <svg xmlns="http://www.w3.org/2000/svg" class="hidden h-4 w-4 stroke-current dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 stroke-current dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              </button>
            `
          }} />
          <button
            onClick={onToggleExpandAll}
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
  );
}