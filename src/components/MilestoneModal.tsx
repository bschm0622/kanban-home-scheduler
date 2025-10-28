import { useEffect } from "react";
import confetti from "canvas-confetti";

interface MilestoneModalProps {
  isOpen: boolean;
  milestoneDay: number;
  onClose: () => void;
}

export default function MilestoneModal({ isOpen, milestoneDay, onClose }: MilestoneModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Big confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getMessage = (days: number) => {
    if (days >= 365) return "🏆 ONE YEAR STREAK! Absolutely legendary!";
    if (days >= 200) return "⭐ 200+ Days! You're a productivity superhero!";
    if (days >= 100) return "💯 100 Day Streak! Triple digits!";
    if (days >= 60) return "🚀 60 Day Streak! You're unstoppable!";
    if (days >= 30) return "🎉 30 Day Streak! A full month!";
    if (days >= 14) return "💪 Two Week Streak! Keep it going!";
    if (days >= 7) return "🔥 One Week Streak! Great start!";
    return `🎊 ${days} Day Streak!`;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-md rounded-lg border border-muted p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {getMessage(milestoneDay)}
        </h2>
        <p className="text-tertiary mb-6">
          You've completed tasks for {milestoneDay} consecutive days!
        </p>

        <button
          onClick={onClose}
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 touch-manipulation transition-opacity min-h-[48px]"
        >
          Keep Going! 💪
        </button>
      </div>
    </div>
  );
}
