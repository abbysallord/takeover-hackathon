import type { ReactNode } from 'react';
import { CheckCircle2, RotateCw, Circle, AlertCircle } from 'lucide-react';

export type TimelineStepStatus = 'completed' | 'processing' | 'pending' | 'error';

export interface TimelineStep {
  title: string;
  description?: string;
  status: TimelineStepStatus;
  timestamp?: string;
  content?: ReactNode;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="relative pl-3">
      {/* Vertical line */}
      <div className="absolute top-3 bottom-8 left-[19px] w-px bg-white/10" />

      <div className="flex flex-col gap-8">
        {steps.map((step, index) => {
          let Icon = Circle;
          let iconColor = 'text-white/20';
          let iconBg = 'bg-[#151516]'; // Match the main background color

          if (step.status === 'completed') {
            Icon = CheckCircle2;
            iconColor = 'text-[#28c840]';
          } else if (step.status === 'processing') {
            Icon = RotateCw;
            iconColor = 'text-[#3b82f6]';
          } else if (step.status === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-[#ff5f57]';
          }

          return (
            <div key={index} className="relative z-10 flex gap-5 group">
              <div className={`mt-0.5 w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor} ${step.status === 'processing' ? 'animate-spin' : ''}`} />
              </div>

              <div className="flex flex-col flex-1 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-medium ${step.status === 'pending' ? 'text-white/50' : 'text-white/90'}`}>
                    {step.title}
                  </h4>
                  {step.timestamp && (
                    <span className="text-[10px] text-white/40">{step.timestamp}</span>
                  )}
                </div>
                
                {step.description && (
                  <p className={`text-xs ${step.status === 'pending' ? 'text-white/30' : 'text-white/50'} mb-3 leading-relaxed`}>
                    {step.description}
                  </p>
                )}

                {step.content && step.status !== 'pending' && (
                  <div className="mt-1 animate-fade-up">
                    {step.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
