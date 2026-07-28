import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void>;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function usePullToRefresh({
  threshold = 80,
  onRefresh,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
      }
    },
    [isRefreshing, threshold]
  );

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    pulling.current = false;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
