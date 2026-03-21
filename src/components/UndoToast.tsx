import { useEffect, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { TaskStatus } from "../types";

interface UndoAction {
  type: 'complete' | 'delete';
  taskId: Id<"tasks">;
  previousStatus?: TaskStatus;
  previousWeekId?: string;
}

interface UndoToastProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({ action, onUndo, onDismiss }: UndoToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (action && action.type === 'delete') {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [action]);

  if (!visible || !action) return null;

  return (
    <div
      className="fixed left-0 right-0 flex justify-center z-50 animate-[fadeUp_0.2s_ease-out]"
      style={{ bottom: `calc(6rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <div className="flex items-center gap-3 bg-foreground text-surface rounded-full shadow-lg px-4 py-2 text-sm">
        <span>Deleted</span>
        <button
          onClick={() => { onUndo(); setVisible(false); }}
          className="font-semibold text-primary touch-manipulation"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
