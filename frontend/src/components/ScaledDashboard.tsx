import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function ScaledDashboard({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<string | number>('auto');

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !innerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const designWidth = 896;
      
      const newScale = Math.min(containerWidth / designWidth, 1);
      setScale(newScale);
      
      const innerHeight = innerRef.current.offsetHeight;
      setHeight(`${innerHeight * newScale}px`);
    };

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (innerRef.current) {
      resizeObserver.observe(innerRef.current);
    }

    updateScale();
    // small delay to ensure fonts/images load
    setTimeout(updateScale, 100);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full relative" style={{ height }}>
      <div
        ref={innerRef}
        className="absolute top-0 left-0"
        style={{
          width: '896px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}
