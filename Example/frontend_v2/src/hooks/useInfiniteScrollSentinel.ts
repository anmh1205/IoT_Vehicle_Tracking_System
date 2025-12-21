import { RefObject, useEffect, useRef } from 'react';

export interface UseInfiniteScrollSentinelOptions {
  enabled?: boolean;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useInfiniteScrollSentinel(
  onIntersect: () => void,
  options: UseInfiniteScrollSentinelOptions = {}
): RefObject<HTMLDivElement> {
  const { enabled = true, root = null, rootMargin = '0px', threshold = 0.5 } = options;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) onIntersect();
      },
      { root, rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, onIntersect, root, rootMargin, threshold]);

  return ref as RefObject<HTMLDivElement>;
}


