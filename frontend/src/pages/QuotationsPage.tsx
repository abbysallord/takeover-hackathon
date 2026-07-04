import { FileText, Send, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export function QuotationsPage() {
  const quotes = [
    { id: 'QT-2026-041', client: 'Acme Corp', amount: '$45,000', status: 'signed', date: 'Oct 24, 2026' },
    { id: 'QT-2026-042', client: 'TechFlow', amount: '$12,500', status: 'sent', date: 'Oct 23, 2026' },
    { id: 'QT-2026-043', client: 'Global Retail', amount: '$120,000', status: 'viewed', date: 'Oct 21, 2026' },
    { id: 'QT-2026-044', client: 'Startup Co', amount: '$4,200', status: 'draft', date: 'Oct 20, 2026' },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Quotations</h1>
          <p className="text-sm text-white/40">Manage your AI-generated PDF quotes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotes.map((q, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  {q.client} <span className="text-xs text-white/40 font-normal">{q.id}</span>
                </div>
                <div className="text-xs text-white/40 mt-1">Generated {q.date}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-12">
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{q.amount}</div>
                <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Total Value</div>
              </div>
              
              <div className="w-24 flex justify-end">
                {q.status === 'signed' && <Badge variant="success">Signed</Badge>}
                {q.status === 'viewed' && <Badge variant="processing">Viewed</Badge>}
                {q.status === 'sent' && <Badge variant="neutral">Sent</Badge>}
                {q.status === 'draft' && <Badge variant="warning">Draft</Badge>}
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
