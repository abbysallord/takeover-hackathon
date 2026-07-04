import { Bell, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export function NotificationsPage() {
  const notifications = [
    { icon: CheckCircle2, title: 'Quote Approved', desc: 'Acme Corp quote QT-2026-041 was signed.', time: '10 mins ago', type: 'success' },
    { icon: FileText, title: 'New Document Indexed', desc: 'Standard_Terms_and_Conditions.pdf added to RAG.', time: '1 hour ago', type: 'neutral' },
    { icon: AlertCircle, title: 'Approval Required', desc: 'High-value draft for Global Retail needs review.', time: '3 hours ago', type: 'warning' },
    { icon: Bell, title: 'Workflow Completed', desc: 'Daily CRM sync finished successfully.', time: 'Yesterday', type: 'neutral' },
  ];

  return (
    <div className="animate-fade-up max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Notifications</h1>
          <p className="text-sm text-white/40">Recent system events and alerts.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {notifications.map((notif, i) => (
            <div key={i} className="p-5 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                notif.type === 'success' ? 'bg-[#28c840]/10 text-[#28c840]' : 
                notif.type === 'warning' ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]' : 
                'bg-white/10 text-white'
              }`}>
                <notif.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-medium text-white">{notif.title}</h3>
                  <span className="text-[10px] text-white/40">{notif.time}</span>
                </div>
                <p className="text-sm text-white/60">{notif.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
