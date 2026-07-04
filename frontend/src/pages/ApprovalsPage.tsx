import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { mockApi } from '../services/mockApi';

export function ApprovalsPage() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState([
    { id: 1, type: 'Quote Generation', client: 'Acme Corp', amount: '$45,000', confidence: 98, status: 'pending' },
    { id: 2, type: 'Email Draft', client: 'TechFlow', amount: '-', confidence: 92, status: 'pending' },
    { id: 3, type: 'CRM Update', client: 'Global Retail', amount: '-', confidence: 99, status: 'approved' },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<number | null>(null);

  const handleApproveClick = (id: number) => {
    setSelectedApproval(id);
    setDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApproval) return;
    setDialogOpen(false);
    
    // Call mock API
    await mockApi.approveAction(selectedApproval);
    
    // Update local state
    setApprovals(prev => prev.map(a => a.id === selectedApproval ? { ...a, status: 'approved' } : a));
    
    // Trigger toast
    toast('Workflow action approved and executed successfully.', 'success');
  };

  return (
    <PageTransition>
      <div className="animate-fade-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Approval Center</h1>
            <p className="text-sm text-white/40">Review and approve high-stakes AI actions.</p>
          </div>
          <button 
            onClick={() => toast('All pending workflows have been approved.', 'success')}
            className="bg-[#28c840]/20 text-[#28c840] hover:bg-[#28c840]/30 px-4 py-2 rounded-lg text-sm font-medium border border-[#28c840]/30 transition-colors"
          >
            Approve All Pending
          </button>
        </div>

        <div className="grid gap-4">
          {approvals.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'pending' ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]' : 'bg-[#28c840]/10 text-[#28c840]'}`}>
                  {item.status === 'pending' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{item.type} <span className="text-white/40">for</span> {item.client}</div>
                  <div className="text-xs text-white/40 mt-1">AI Confidence Score: <span className={item.confidence > 95 ? 'text-[#28c840]' : 'text-[#ff9f0a]'}>{item.confidence}%</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors">
                  <Eye className="w-4 h-4" /> Review
                </button>
                {item.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => toast('Action rejected.', 'error')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ff5f57]/10 hover:bg-[#ff5f57]/20 text-[#ff5f57] text-xs font-medium border border-[#ff5f57]/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button 
                      onClick={() => handleApproveClick(item.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirm Workflow Execution"
          onConfirm={handleConfirmApprove}
          confirmText="Approve Action"
        >
          <p>Are you sure you want to approve this AI-generated action? The workflow will proceed and update the CRM accordingly.</p>
        </Dialog>
      </div>
    </PageTransition>
  );
}
