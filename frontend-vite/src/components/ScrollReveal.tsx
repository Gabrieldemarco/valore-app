import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const dirClass = direction !== 'up' ? `reveal-${direction}` : '';
  const delayClass = delay > 0 ? `delay-${Math.min(delay, 5)}` : '';

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${dirClass} ${delayClass} ${className}`}
    >
      {children}
    </div>
  );
}
