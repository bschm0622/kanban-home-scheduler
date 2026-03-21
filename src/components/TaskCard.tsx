import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Id } from "../../convex/_generated/dataModel";
import type { Task, TaskStatus } from "../types";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: Id<"tasks">, newStatus: TaskStatus) => void;
  onComplete: (taskId: Id<"tasks">) => void;
  onDelete: (taskId: Id<"tasks">) => void;
  onEdit: (taskId: Id<"tasks">) => void;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hours = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hours}:${String(m).padStart(2, '0')} ${suffix}`;
}

const SWIPE_THRESHOLD = 80;

export default function TaskCard({ task, onStatusChange, onComplete, onDelete, onEdit }: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);
  const hapticFired = useRef(false);

  const handleComplete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    const colors = {
      high: ['#ef4444', '#dc2626', '#b91c1c'],
      medium: ['#eab308', '#ca8a04', '#a16207'],
      low: ['#22c55e', '#16a34a', '#15803d'],
    };

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.5, y: 0.5 },
      colors: colors[task.priority],
      scalar: 0.8,
    });

    if (navigator.vibrate) navigator.vibrate(10);
    onComplete(task._id);
  };

  // Swipe gesture handlers — attached natively with { passive: false }
  // so preventDefault() actually works to stop page-level swipe navigation
  const onTouchStartCb = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = false;
    hapticFired.current = false;
    setSwipeDirection(null);
  }, []);

  const onTouchMoveCb = useCallback((e: TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;

    if (Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }

    if (isSwiping.current && contentRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const clampedDelta = Math.max(-150, Math.min(150, deltaX));
      contentRef.current.style.transform = `translateX(${clampedDelta}px)`;
      contentRef.current.style.transition = 'none';

      if (!hapticFired.current && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(10);
        hapticFired.current = true;
      }
    }
  }, []);

  const onTouchEndCb = useCallback(() => {
    const deltaX = touchCurrentX.current - touchStartX.current;

    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.3s ease';
      contentRef.current.style.transform = 'translateX(0)';
    }

    if (isSwiping.current) {
      if (deltaX > SWIPE_THRESHOLD && task.status !== 'completed') {
        handleComplete({ stopPropagation: () => {} } as any);
      } else if (deltaX < -SWIPE_THRESHOLD) {
        onEdit(task._id);
      }
    }

    isSwiping.current = false;
    setSwipeDirection(null);
  }, [task.status, task._id, onEdit]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStartCb, { passive: true });
    el.addEventListener('touchmove', onTouchMoveCb, { passive: false });
    el.addEventListener('touchend', onTouchEndCb, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStartCb);
      el.removeEventListener('touchmove', onTouchMoveCb);
      el.removeEventListener('touchend', onTouchEndCb);
    };
  }, [onTouchStartCb, onTouchMoveCb, onTouchEndCb]);

  const handleCardClick = () => {
    if (!isSwiping.current) {
      setShowActions(!showActions);
    }
  };

  return (
    <div
      ref={cardRef}
      className="task-card relative overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Swipe backgrounds - positioned behind card content */}
      {swipeDirection && (
        <div className="absolute inset-0 flex z-0">
          {swipeDirection === 'right' && (
            <div className="flex-1 bg-green-500 flex items-center pl-4">
              <span className="text-white text-lg font-bold">✓</span>
            </div>
          )}
          {swipeDirection === 'left' && (
            <div className="flex-1 bg-blue-500 flex items-center justify-end pr-4">
              <span className="text-white text-sm font-bold">Edit</span>
            </div>
          )}
        </div>
      )}

      {/* Card content — slides to reveal swipe background */}
      <div ref={contentRef} className={`relative z-10 bg-surface rounded-lg border-l-4 ${
        task.priority === 'high' ? 'border-l-red-500' : task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
      }`}>
        <div className="task-content">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground text-sm leading-snug">{task.title}</h3>
              </div>
              {task.description && (
                <p className="text-xs text-tertiary mt-1 leading-relaxed">{task.description}</p>
              )}
              {task.dueTime && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                  ⏰ {formatTime12h(task.dueTime)}
                </p>
              )}
            </div>
            <div className="flex items-center ml-2">
              {task.status !== 'completed' && (
                <button
                  onClick={handleComplete}
                  className="w-5 h-5 rounded border-2 border-muted hover:border-green-500 flex items-center justify-center text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  title="Mark as complete"
                >
                  ✓
                </button>
              )}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="task-actions">
            <div className="task-action-grid mt-2" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task._id); }}
                className="action-button day flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                  <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                </svg>
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task._id);
                }}
                className="action-button day text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mr-1">
                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
