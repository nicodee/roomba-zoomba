import { useEffect, useRef } from "react";

export function useRunnerControls({ onLeft, onRight, onJump, onDuck, isPaused = false }) {
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isPaused) return;

    function handleKeyDown(e) {
      const navKeys = [
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "a", "d", "w", "s", "A", "D", "W", "S", " "
      ];
      if (navKeys.includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        onLeft?.();
      } else if (key === "arrowright" || key === "d") {
        onRight?.();
      } else if (key === "arrowup" || key === "w" || key === " ") {
        onJump?.();
      } else if (key === "arrowdown" || key === "s") {
        onDuck?.();
      }
    }

    function handleTouchStart(e) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(e) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const threshold = 30; // Minimum swipe distance

      if (Math.max(absX, absY) < threshold) return;

      if (absX > absY) {
        if (deltaX > 0) onRight?.();
        else onLeft?.();
      } else {
        if (deltaY > 0) onDuck?.();
        else onJump?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onLeft, onRight, onJump, onDuck, isPaused]);
}
