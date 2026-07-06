import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Clock, Zap, RefreshCw, ShoppingBag } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setIsLoading(true);
      const [res, quotesData] = await Promise.all([
        mockApi.getAnalytics(),
        mockApi.getQuotations()
      ]);
      setData(res);
      setQuotes(quotesData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(true);

    // Auto-refresh analytics in real-time every 8 seconds
    const interval = setInterval(() => {
      loadAnalytics(false);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const totalRevenue = data?.top_products?.reduce((acc: number, curr: any) => acc + curr.revenue, 0) || 0;

  const stats = [
    { 
      label: 'Avg Response Time', 
      value: data?.average_resolution_time_seconds > 0 
        ? `${data.average_resolution_time_seconds.toFixed(1)}s` 
        : 'N/A', 
      trend: 'Dynamic', 
      icon: Clock, 
      color: 'text-blue-500' 
    },
    { 
      label: 'Workflows Executed', 
      value: data?.total_workflows_count?.toLocaleString() || '0', 
      trend: 'Real-time', 
      icon: Zap, 
      color: 'text-yellow-500' 
    },
    { 
      label: 'Automation Success', 
      value: data?.automation_rate ? `${Math.round(data.automation_rate)}%` : '100%', 
      trend: 'Auto-rate', 
      icon: TrendingUp, 
      color: 'text-green-500' 
    },
    { 
      label: 'Pipeline Influenced', 
      value: `$${totalRevenue.toLocaleString()}`, 
      trend: 'Total Deal', 
      icon: BarChart2, 
      color: 'text-purple-500' 
    },
  ];

  // Map daily volumes for charts
  const chartData = data?.daily_volumes?.map((v: any) => {
    const parts = v.date.split('-');
    const label = parts.length > 2 ? `${parts[1]}/${parts[2]}` : v.date;
    return {
      name: label,
      workflows: v.count
    };
  }) || [];

  return (
    <PageTransition>
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Analytics Overview</h1>
            <p className="text-sm text-white/40">Measure the impact of automated operations on your sales cycle.</p>
          </div>
          <button 
            onClick={() => loadAnalytics(true)}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            <div className="grid md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-32 animate-pulse" />
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl h-80 animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <Card key={i} className="p-5 flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{stat.trend}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Graphic Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <Card className="p-6 h-80 flex flex-col justify-between lg:col-span-2">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-6">Workflows Executed (Daily Volume)</h3>
                <div className="flex-1 w-full min-h-[200px]">
                  {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-white/20">No workflow history recorded yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWorkflows" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e1e21', borderColor: '#ffffff10', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="workflows" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorWorkflows)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Product Revenue Leaderboard */}
              <Card className="p-6 h-80 flex flex-col justify-between">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Top Selling Products</h3>
                <div className="flex-grow overflow-y-auto flex flex-col gap-3.5 pr-1">
                  {!data?.top_products || data.top_products.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-white/20 py-12">No quotation sales items recorded.</div>
                  ) : (
                    data.top_products.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#3b82f6]/10 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-[#3b82f6]" />
                          </div>
                          <div>
                            <div className="text-xs text-white font-medium truncate max-w-[120px]">{p.product}</div>
                            <div className="text-[10px] text-white/40">{p.quantity} units sold</div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-white">${p.revenue.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Successful Deals */}
            <Card className="p-6">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Successful Deals & Invoices</h3>
              <div className="overflow-x-auto">
                {quotes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-white/20 italic">No closed sales recorded.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 uppercase tracking-wider">
                        <th className="py-2.5 font-medium">Quote Number</th>
                        <th className="py-2.5 font-medium">Customer/Company</th>
                        <th className="py-2.5 font-medium">Items Sold</th>
                        <th className="py-2.5 font-medium text-right">Value (USD)</th>
                        <th className="py-2.5 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quotes.map((q: any, i: number) => {
                        const itemsDesc = q.items && q.items.length > 0
                          ? q.items.map((item: any) => `${item.quantity}x ${item.product}`).join(', ')
                          : 'Standard Package';
                        return (
                          <tr key={i} className="text-white/80 hover:bg-white/[0.01]">
                            <td className="py-3 font-semibold text-white">{q.quote_number}</td>
                            <td className="py-3">{q.client_name || 'Private Client'}</td>
                            <td className="py-3 text-white/60">{itemsDesc}</td>
                            <td className="py-3 text-right font-bold text-white">${q.total_amount.toLocaleString()}</td>
                            <td className="py-3 text-right text-white/45">{new Date(q.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
