import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-5 ${className}`}>
      {children}
    </div>
  );
}
