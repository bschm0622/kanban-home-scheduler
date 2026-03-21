import { useRef, useEffect, useState, useCallback } from "react";

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120; // max visual pull distance

export function usePullToRefresh() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPullDistance(THRESHOLD); // hold spinner in place
    // Short delay so the spinner is visible, then reload
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start pull if scrolled to top
      if (el.scrollTop <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && el.scrollTop <= 0) {
        // Apply resistance curve
        const distance = Math.min(delta * 0.5, MAX_PULL);
        setPullDistance(distance);
        if (distance > 10) {
          e.preventDefault(); // prevent native scroll while pulling
        }
      } else {
        pulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistance >= THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, handleRefresh]);

  return { scrollRef, pullDistance, refreshing };
}
