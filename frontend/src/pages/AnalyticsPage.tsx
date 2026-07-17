import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Clock, Zap, RefreshCw, ShoppingBag, Package } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setIsLoading(true);
      const [res, quotesData, inventoryData] = await Promise.all([
        mockApi.getAnalytics(),
        mockApi.getQuotations(),
        mockApi.getInventory()
      ]);
      setData(res);
      setQuotes(quotesData);
      setInventory(inventoryData);
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

            {/* Bottom Row Grid: Current Stock Levels & Successful Deals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Stock Levels */}
              <Card className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">Current Stock Levels</h3>
                  <p className="text-[10px] text-white/40 mb-4">Real-time warehouse inventory stock tracking</p>
                </div>
                <div className="flex-grow overflow-y-auto flex flex-col gap-3.5 pr-1 max-h-[300px]">
                  {inventory.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-white/20 py-12">No inventory records.</div>
                  ) : (
                    inventory.map((item: any, idx: number) => {
                      const capacity = 2000;
                      const percentage = Math.min(100, Math.max(0, (item.current_stock / capacity) * 100));
                      
                      // Determine status colors and badge
                      let statusText = "Healthy";
                      let badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      let progressClass = "bg-emerald-500";
                      
                      if (item.current_stock === 0) {
                        statusText = "Out of Stock";
                        badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                        progressClass = "bg-rose-500";
                      } else if (item.current_stock <= 500) {
                        statusText = "Low Stock";
                        badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        progressClass = "bg-amber-500";
                      }

                      return (
                        <div key={idx} className="bg-white/[0.02] p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center">
                                <Package className="w-3.5 h-3.5 text-white/60" />
                              </div>
                              <div>
                                <div className="text-xs text-white font-medium truncate max-w-[110px]">{item.product_name}</div>
                                <div className="text-[9px] text-white/40">{item.sku}</div>
                              </div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{statusText}</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${progressClass} rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-white/40 mt-0.5">
                              <span>{item.current_stock.toLocaleString()} units</span>
                              <span>max {capacity.toLocaleString()}</span>
                            </div>
                            {item.current_stock === 0 && (
                              <p className="text-[8px] text-rose-400/80 italic mt-0.5">⚠️ Auto-Skipping incoming enquiry emails</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Recent Successful Deals */}
              <Card className="p-6 lg:col-span-2">
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
          </div>
        )}
      </div>
    </PageTransition>
  );
}
