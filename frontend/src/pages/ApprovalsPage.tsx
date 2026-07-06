import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { mockApi } from '../services/mockApi';

export function ApprovalsPage() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<number | null>(null);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getApprovals();
      setApprovals(data);
    } catch (e) {
      console.error("Error loading approvals:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApproveClick = (id: number) => {
    setSelectedApproval(id);
    setDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApproval) return;
    setDialogOpen(false);
    setIsProcessing(true);
    
    try {
      const res = await mockApi.approveAction(selectedApproval);
      if (res.success) {
        await fetchApprovals();
        toast('Workflow action approved and executed successfully.', 'success');
      } else {
        toast('Failed to approve workflow action.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to approve workflow action.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await mockApi.rejectAction(id);
      if (res.success) {
        await fetchApprovals();
        toast('Action rejected and workflow cancelled.', 'error');
      } else {
        toast('Failed to reject workflow action.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to reject workflow action.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageTransition>
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          <span className="text-xs text-white/80 font-medium tracking-wide">Executing AI Workflow Agent...</span>
        </div>
      )}

      <div className="animate-fade-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Approval Center</h1>
            <p className="text-sm text-white/40">Review and approve high-stakes AI actions.</p>
          </div>
          <button 
            disabled={isProcessing}
            onClick={async () => {
              const pending = approvals.filter(a => a.status === 'pending');
              if (pending.length === 0) return;
              setIsProcessing(true);
              try {
                for (const item of pending) {
                  await mockApi.approveAction(item.id);
                }
                await fetchApprovals();
                toast('All pending workflows have been approved.', 'success');
              } catch (e) {
                console.error(e);
              } finally {
                setIsProcessing(false);
              }
            }}
            className="bg-[#28c840]/20 text-[#28c840] hover:bg-[#28c840]/30 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium border border-[#28c840]/30 transition-colors"
          >
            Approve All Pending
          </button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            // Skeleton loader
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 h-20 animate-pulse" />
            ))
          ) : approvals.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/40 bg-white/[0.02] border border-white/5 rounded-xl">
              No pending approvals require your review.
            </div>
          ) : (
            approvals.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'pending' ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]' : 'bg-[#28c840]/10 text-[#28c840]'}`}>
                    {item.status === 'pending' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.type} <span className="text-white/40">for</span> {item.client}</div>
                    <div className="text-xs text-white/40 mt-1">
                      Value: <span className="text-white font-medium mr-3">{item.amount}</span>
                      AI Confidence Score: <span className={item.confidence > 95 ? 'text-[#28c840]' : 'text-[#ff9f0a]'}>{item.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleRejectClick(item.id)}
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
            ))
          )}
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
