import { BarChart2, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function AnalyticsPage() {
  const stats = [
    { label: 'Time Saved', value: '142 hrs', trend: '+12%', icon: Clock, color: 'text-blue-500' },
    { label: 'Workflows Run', value: '8,432', trend: '+24%', icon: Zap, color: 'text-yellow-500' },
    { label: 'Win Rate', value: '64%', trend: '+5%', icon: TrendingUp, color: 'text-green-500' },
    { label: 'Revenue Influenced', value: '$242k', trend: '+18%', icon: BarChart2, color: 'text-purple-500' },
  ];

  const chartData = [
    { name: 'Oct 1', workflows: 40 },
    { name: 'Oct 5', workflows: 60 },
    { name: 'Oct 10', workflows: 45 },
    { name: 'Oct 15', workflows: 80 },
    { name: 'Oct 20', workflows: 55 },
    { name: 'Oct 25', workflows: 90 },
    { name: 'Oct 30', workflows: 100 },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Analytics overview</h1>
          <p className="text-sm text-white/40">Measure the impact of Flow by Hackarena on your sales cycle.</p>
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
        <div className="flex-1 w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWorkflows" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e21', borderColor: '#ffffff10', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="workflows" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorWorkflows)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
