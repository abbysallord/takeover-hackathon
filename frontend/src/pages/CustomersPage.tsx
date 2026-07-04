import { Search, Download, Filter } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export function CustomersPage() {
  const customers = [
    { name: 'Acme Corp', contact: 'Sarah Jenkins', mrr: '$4,500', health: 'excellent', workflows: 24 },
    { name: 'TechFlow', contact: 'David Chen', mrr: '$1,200', health: 'good', workflows: 8 },
    { name: 'Global Retail', contact: 'Amanda Torres', mrr: '$12,000', health: 'at_risk', workflows: 142 },
    { name: 'Startup Co', contact: 'Mike Ross', mrr: '$500', health: 'good', workflows: 2 },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Customers</h1>
          <p className="text-sm text-white/40">View and manage your active customer base.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10 flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10 flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search customers..." className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full" />
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-xs text-white/40 uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Company</th>
              <th className="px-6 py-4 font-medium">Contact</th>
              <th className="px-6 py-4 font-medium">MRR</th>
              <th className="px-6 py-4 font-medium">Health Score</th>
              <th className="px-6 py-4 font-medium">Active Workflows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">{c.name}</td>
                <td className="px-6 py-4 text-sm text-white/60">{c.contact}</td>
                <td className="px-6 py-4 text-sm text-white/90">{c.mrr}</td>
                <td className="px-6 py-4">
                  <Badge variant={c.health === 'excellent' ? 'success' : c.health === 'at_risk' ? 'warning' : 'processing'}>
                    {c.health.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-white/60">{c.workflows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
