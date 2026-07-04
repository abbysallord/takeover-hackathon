import { BarChart2, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';

export function AnalyticsPage() {
  const stats = [
    { label: 'Time Saved', value: '142 hrs', trend: '+12%', icon: Clock, color: 'text-blue-500' },
    { label: 'Workflows Run', value: '8,432', trend: '+24%', icon: Zap, color: 'text-yellow-500' },
    { label: 'Win Rate', value: '64%', trend: '+5%', icon: TrendingUp, color: 'text-green-500' },
    { label: 'Revenue Influenced', value: '$242k', trend: '+18%', icon: BarChart2, color: 'text-purple-500' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Analytics overview</h1>
          <p className="text-sm text-white/40">Measure the impact of FlowOps AI on your sales cycle.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-xs font-medium text-green-500">{stat.trend}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 h-80 flex flex-col justify-between">
        <h3 className="text-sm font-medium text-white mb-6">Workflows Executed (30 Days)</h3>
        <div className="flex-1 flex items-end gap-2 sm:gap-4 h-full pt-4">
          {/* Simulated Chart Bars */}
          {[40, 60, 45, 80, 55, 90, 75, 100, 85, 65, 70, 95].map((height, i) => (
            <div key={i} className="flex-1 bg-[#3b82f6]/20 hover:bg-[#3b82f6] rounded-t-sm transition-colors relative group cursor-pointer" style={{ height: `${height}%` }}>
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-xs font-bold py-1 px-2 rounded pointer-events-none transition-opacity">
                {height * 12}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-4 uppercase tracking-wider">
          <span>Oct 1</span>
          <span>Oct 15</span>
          <span>Oct 30</span>
        </div>
      </Card>
    </div>
  );
}
