import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'processing';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-[#28c840]/10 text-[#28c840] ring-1 ring-[#28c840]/20',
    warning: 'bg-[#febc2e]/10 text-[#febc2e] ring-1 ring-[#febc2e]/20',
    error: 'bg-[#ff5f57]/10 text-[#ff5f57] ring-1 ring-[#ff5f57]/20',
    neutral: 'bg-white/5 text-white/60 ring-1 ring-white/10',
    processing: 'bg-[#3b82f6]/10 text-[#3b82f6] ring-1 ring-[#3b82f6]/20'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
