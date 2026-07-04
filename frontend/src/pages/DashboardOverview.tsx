import { useState, useEffect } from 'react';
import { Grid, CheckCircle2, RotateCw, Sparkles, Zap } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch mock data from our API service
    Promise.all([
      mockApi.getStats().then(setStats),
      mockApi.getWorkflows().then(setWorkflows)
    ]).then(() => setIsLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6] flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Acme Electronics</h2>
              <p className="text-xs text-white/45 mt-0.5">AI Sales Operations Workspace</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg transition-colors text-white text-xs font-medium border border-white/5">
            <Sparkles className="w-4 h-4" />
            Run Workflow
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5 rounded-2xl bg-white/[0.03] ring-1 ring-white/5 mb-8">
          {[
            { label: 'EMAILS TODAY', value: stats?.emailsToday },
            { label: 'ACTIVE LEADS', value: stats?.activeLeads },
            { label: 'QUOTES GENERATED', value: stats?.quotesGenerated },
            { label: 'REVENUE PIPELINE', value: stats?.revenuePipeline }
          ].map((stat, i) => (
            <div key={i} className="px-6 py-5 flex flex-col justify-center">
              <div className="text-[10px] tracking-wider text-white/35 font-semibold mb-1.5">{stat.label}</div>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-medium text-white">{stat.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {['Hardware Sales', 'Software Licensing', 'Enterprise Solutions'].map((cat, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-5 flex flex-col gap-3 relative overflow-hidden group cursor-pointer hover:bg-white/[0.05] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2">
                <Grid className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-sm text-white font-medium">{cat}</span>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Workflow Table */}
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Active Workflow Pipeline</span>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Process Step</th>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Description</th>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton Rows
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={`skel-${i}`}>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-32 bg-white/5 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-64 bg-white/5 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-20 bg-white/5 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  workflows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-white/80 border-b border-white/5 group-last:border-0">{row.step}</td>
                      <td className="px-4 py-3.5 text-[11px] text-white/50 border-b border-white/5 group-last:border-0">{row.desc}</td>
                      <td className={`px-4 py-3.5 text-[11px] font-medium border-b border-white/5 group-last:border-0 flex items-center gap-2 ${row.color}`}>
                        {row.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : (row.status === 'Processing' ? <RotateCw className="w-4 h-4 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20 ml-1" />)}
                        {row.status}
                      </td>
                    </tr>
                  ))
                )}
                {!isLoading && workflows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-white/40">No active workflows found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
