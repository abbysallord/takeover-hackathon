import { 
  PanelLeft, ChevronLeft, ChevronRight, Monitor, 
  RotateCw, Share, Plus, Copy, Grid, CheckCircle2,
  LayoutDashboard, Inbox, UserPlus, Users, FileText, 
  CheckSquare, BarChart2, BookOpen, Bell, Settings,
  Sparkles, Zap
} from 'lucide-react';
import { Logo } from './Logo';

export function DashboardMockup() {
  return (
    <div className="rounded-t-2xl overflow-hidden bg-[#1a1a1c] shadow-[0_-20px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 text-left font-sans">
      
      {/* Title Bar */}
      <div className="bg-[#242427] border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-3 ml-2">
            <PanelLeft className="w-3.5 h-3.5 text-white/40" />
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
              <ChevronRight className="w-3.5 h-3.5 text-white/25" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center">
          <div className="bg-[#1a1a1c] rounded-md px-6 py-1 flex items-center gap-2">
            <Monitor className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/60">hackarena.com</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RotateCw className="w-3.5 h-3.5 text-white/40" />
          <Share className="w-3.5 h-3.5 text-white/40" />
          <Plus className="w-3.5 h-3.5 text-white/40" />
          <Copy className="w-3.5 h-3.5 text-white/40" />
        </div>
      </div>

      <div className="flex h-[520px]">
        {/* Sidebar */}
        <div className="w-[22%] border-r border-white/5 bg-[#1e1e21] px-3 py-3.5 flex flex-col gap-5">
          <div className="flex items-center justify-between px-1">
            <Logo className="w-4 h-4 text-white/70" />
            <Grid className="w-3.5 h-3.5 text-white/30" />
          </div>
          
          <div className="flex items-center gap-2 px-1">
            <div className="w-4 h-4 rounded bg-[#3b82f6] flex items-center justify-center text-[10px] font-bold text-white">
              A
            </div>
            <span className="text-[10px] text-white/80 font-medium">Acme Electronics</span>
          </div>

          <div className="flex flex-col gap-0.5">
            {[
              { icon: LayoutDashboard, label: 'Dashboard' },
              { icon: Inbox, label: 'Email Inbox' },
              { icon: UserPlus, label: 'Leads' },
              { icon: Users, label: 'Customers' },
              { icon: FileText, label: 'Quotations' },
              { icon: CheckSquare, label: 'Approvals' },
              { icon: BarChart2, label: 'Analytics' },
              { icon: BookOpen, label: 'Knowledge Base' },
              { icon: Bell, label: 'Notifications' },
              { icon: Settings, label: 'Settings' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                <item.icon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[10px] text-white/60">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#151516] p-6 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3b82f6] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-white">Acme Electronics</h2>
                <p className="text-[10px] text-white/45">AI Sales Operations Workspace</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-md transition-colors text-white text-[11px] font-medium border border-white/5">
              <Sparkles className="w-3 h-3" />
              Run Workflow
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 divide-x divide-white/5 rounded-xl bg-white/[0.03] ring-1 ring-white/5 mb-6">
            {[
              { label: 'EMAILS TODAY', value: '142' },
              { label: 'ACTIVE LEADS', value: '38' },
              { label: 'QUOTES GENERATED', value: '24' },
              { label: 'REVENUE PIPELINE', value: '$1.2M' }
            ].map((stat, i) => (
              <div key={i} className="px-5 py-4 flex flex-col justify-center">
                <div className="text-[8px] tracking-wider text-white/35 font-semibold mb-1">{stat.label}</div>
                <div className="text-xl font-medium text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['Hardware Sales', 'Software Licensing', 'Enterprise Solutions'].map((cat, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 p-4 flex flex-col gap-2 relative overflow-hidden group cursor-pointer hover:bg-white/[0.05] transition-colors">
                <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center mb-2">
                  <Grid className="w-3.5 h-3.5 text-white/40" />
                </div>
                <span className="text-xs text-white font-medium">{cat}</span>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
              </div>
            ))}
          </div>

          {/* Workflow Table */}
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01]">
              <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Active Workflow Pipeline</span>
            </div>
            <div className="p-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-[9px] font-medium text-white/35 uppercase">Process Step</th>
                    <th className="px-3 py-2 text-[9px] font-medium text-white/35 uppercase">Description</th>
                    <th className="px-3 py-2 text-[9px] font-medium text-white/35 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { step: 'Information Extraction', desc: 'Parsing requirements from incoming customer email.', status: 'Completed', color: 'text-[#28c840]' },
                    { step: 'Knowledge Retrieval', desc: 'RAG search for related technical documentation.', status: 'Completed', color: 'text-[#28c840]' },
                    { step: 'Inventory Check', desc: 'Checking CRM & warehouse for available stock.', status: 'Processing', color: 'text-[#3b82f6]' },
                    { step: 'Quotation Generation', desc: 'Drafting PDF quote based on available inventory.', status: 'Pending', color: 'text-white/40' },
                    { step: 'Manager Approval', desc: 'Awaiting human review before sending out email.', status: 'Pending', color: 'text-white/40' }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-3 py-2.5 text-[11px] text-white/80 border-b border-white/5 group-last:border-0">{row.step}</td>
                      <td className="px-3 py-2.5 text-[10px] text-white/50 border-b border-white/5 group-last:border-0">{row.desc}</td>
                      <td className={`px-3 py-2.5 text-[10px] font-medium border-b border-white/5 group-last:border-0 flex items-center gap-1.5 ${row.color}`}>
                        {row.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : (row.status === 'Processing' ? <RotateCw className="w-3 h-3 animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20 ml-0.5" />)}
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
