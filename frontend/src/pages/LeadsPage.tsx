import { Plus, MoreHorizontal } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export function LeadsPage() {
  const columns = [
    { name: 'New Inbound', count: 12 },
    { name: 'AI Contacted', count: 4 },
    { name: 'Quote Sent', count: 2 },
    { name: 'Closed Won', count: 8 },
  ];

  const leads = [
    { name: 'TechFlow Corp', contact: 'David Chen', value: '$12,000', col: 0, priority: 'high' },
    { name: 'Acme Inc', contact: 'Sarah J.', value: '$5,000', col: 0, priority: 'medium' },
    { name: 'Global Retail', contact: 'Amanda T.', value: '$45,000', col: 1, priority: 'high' },
    { name: 'Startup Co', contact: 'Mike R.', value: '$2,500', col: 2, priority: 'low' },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Leads Pipeline</h1>
          <p className="text-sm text-white/40">Manage and track your AI-driven sales pipeline.</p>
        </div>
        <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
        {columns.map((col, i) => (
          <div key={i} className="min-w-[300px] w-[300px] flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/10">
              <h3 className="font-medium text-white/90 text-sm">{col.name}</h3>
              <Badge variant="neutral">{col.count}</Badge>
            </div>
            
            <div className="flex flex-col gap-3">
              {leads.filter(l => l.col === i).map((lead, j) => (
                <div key={j} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:border-white/20 hover:bg-white/10 transition-colors cursor-grab">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-white">{lead.name}</span>
                    <button className="text-white/40 hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <div className="text-xs text-white/40 mb-4">{lead.contact}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white/90">{lead.value}</span>
                    <Badge variant={lead.priority === 'high' ? 'warning' : 'neutral'}>{lead.priority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
