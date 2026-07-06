import { useState, useEffect } from 'react';
import { Mail, Search, FileText, CheckCircle2, Send, User, Clock, RotateCw } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/ui/ToastContext';
import { Typewriter } from '../components/Typewriter';
import { mockApi } from '../services/mockApi';

export function InboxPage() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const loadEmails = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getEmails();
      setEmails(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
        setSelectedEmail(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();

    // Auto-refresh the inbox list in real-time every 8 seconds
    const interval = setInterval(async () => {
      try {
        const data = await mockApi.getEmails();
        setEmails(data);
      } catch (e) {
        console.error("Error auto-refreshing emails:", e);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      const email = emails.find(e => e.id === selectedId);
      if (email) setSelectedEmail(email);

      // Check if this email has an associated workflow
      mockApi.getWorkflowByEmailId(selectedId).then(wf => {
        setWorkflow(wf);
      });
    }
  }, [selectedId, emails]);

  const handleApprove = async () => {
    if (!workflow) return;
    try {
      setApproving(true);
      
      // 1. Try to find in workflow.approvals relation
      let pendingApprovalId = workflow.approvals?.find((a: any) => a.status === 'PENDING' || a.status === 'pending')?.id;
      
      // 2. Fallback to steps output details
      if (!pendingApprovalId) {
        pendingApprovalId = workflow.steps?.find((s: any) => s.stage === "REQUEST_APPROVAL" && s.status === "COMPLETED")?.output_data?.tool_output?.approval_id;
      }
      
      // 3. Fallback to fetching all pending approvals
      if (!pendingApprovalId) {
        const approvals = await mockApi.getApprovals();
        const app = approvals.find((a: any) => a.status === 'pending');
        if (app) {
          pendingApprovalId = app.id;
        }
      }

      if (!pendingApprovalId) {
        toast('No active approval found to confirm.', 'error');
        return;
      }
      
      await mockApi.approveAction(pendingApprovalId);
      toast('AI draft response approved and dispatched!', 'success');
      await loadEmails();
    } catch (e) {
      console.error(e);
      toast('Failed to dispatch approved response.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!workflow) return;
    try {
      setApproving(true);
      
      // 1. Try to find in workflow.approvals relation
      let pendingApprovalId = workflow.approvals?.find((a: any) => a.status === 'PENDING' || a.status === 'pending')?.id;
      
      // 2. Fallback to steps output details
      if (!pendingApprovalId) {
        pendingApprovalId = workflow.steps?.find((s: any) => s.stage === "REQUEST_APPROVAL" && s.status === "COMPLETED")?.output_data?.tool_output?.approval_id;
      }

      // 3. Fallback to fetching all pending approvals
      if (!pendingApprovalId) {
        const approvals = await mockApi.getApprovals();
        const app = approvals.find((a: any) => a.status === 'pending');
        if (app) {
          pendingApprovalId = app.id;
        }
      }

      if (!pendingApprovalId) {
        toast('No active approval found to reject.', 'error');
        return;
      }

      await mockApi.rejectAction(pendingApprovalId);
      toast('AI draft response rejected. Workflow cancelled.', 'error');
      await loadEmails();
    } catch (e) {
      console.error(e);
      toast('Failed to reject response.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const filteredEmails = emails.filter(e => 
    e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-4 md:gap-6 -mt-4">
        {/* Left Pane: Email List */}
        <div className="w-full md:w-80 flex flex-col gap-4 md:border-r border-b md:border-b-0 border-white/5 pb-4 md:pb-0 md:pr-6 flex-shrink-0 h-[40%] md:h-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-white">Inbox</h2>
            <Badge variant="neutral">{emails.length} Emails</Badge>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search emails..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          <div className="flex flex-col gap-2 mt-2 overflow-y-auto pr-2 flex-1">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] h-20 animate-pulse" />
              ))
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12 text-xs text-white/40">No emails found.</div>
            ) : (
              filteredEmails.map(email => {
                const isSelected = selectedId === email.id;
                // Determine display status based on workflow
                let statusBadge = null;
                if (email.direction === "OUTBOUND") {
                  statusBadge = <Badge variant="success">Sent</Badge>;
                } else if (workflow && workflow.email_id === email.id) {
                  if (workflow.status === "COMPLETED") statusBadge = <Badge variant="success">Replied</Badge>;
                  else if (workflow.status === "PENDING_APPROVAL") statusBadge = <Badge variant="warning">Requires Approval</Badge>;
                  else statusBadge = <Badge variant="processing">AI Processing</Badge>;
                } else {
                  statusBadge = email.direction === "INBOUND" ? <Badge variant="neutral">New</Badge> : <Badge variant="success">Sent</Badge>;
                }

                return (
                  <div 
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-white truncate pr-2">{email.sender}</span>
                      <span className="text-[9px] text-white/40 flex-shrink-0 mt-0.5">
                        {new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-xs text-white/80 font-medium line-clamp-1 mb-1">{email.subject}</h3>
                    <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">{email.body}</p>
                    
                    <div className="mt-3">
                      {statusBadge}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Email Detail & AI Draft */}
        <div className="flex-1 flex flex-col overflow-y-auto md:pr-4 pt-4 md:pt-0">
          {selectedEmail ? (
            <div className="max-w-3xl animate-fade-up">
              {/* Original Email Header */}
              <div className="mb-8">
                <h1 className="text-xl font-semibold text-white mb-6">{selectedEmail.subject}</h1>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {selectedEmail.sender} 
                      <span className="text-white/40 font-normal ml-2">&lt;{selectedEmail.sender.includes('<') ? selectedEmail.sender.split('<')[1].replace('>', '') : selectedEmail.sender}&gt;</span>
                    </div>
                    <div className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                      <span>To: {selectedEmail.recipient}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(selectedEmail.received_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-white/70 leading-relaxed bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                  {selectedEmail.body && (
                    selectedEmail.body.trim().toLowerCase().startsWith('<!doctype') ||
                    selectedEmail.body.includes('<html') ||
                    selectedEmail.body.includes('<body') ||
                    selectedEmail.body.includes('<div') ||
                    selectedEmail.body.includes('<p>')
                  ) ? (
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <style>
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: rgba(255, 255, 255, 0.75);
                                background: transparent;
                                margin: 0;
                                padding: 0;
                              }
                              a { color: #3b82f6; }
                              /* Make sure nested elements fit dark theme styling rules */
                              div, p, span, td, th, table, tr { 
                                background-color: transparent !important; 
                                color: rgba(255, 255, 255, 0.75) !important; 
                              }
                            </style>
                          </head>
                          <body>
                            ${selectedEmail.body}
                          </body>
                        </html>
                      `}
                      className="w-full min-h-[350px] border-none bg-transparent"
                      sandbox="allow-same-origin"
                      title="Email Content"
                    />
                  ) : (
                    <div className="whitespace-pre-line">{selectedEmail.body}</div>
                  )}
                </div>
              </div>

              {/* AI Draft Response Section */}
              {workflow && workflow.status === 'PENDING_APPROVAL' && (
                <div className="mt-12 relative">
                  <div className="absolute -left-12 top-0 bottom-0 w-px bg-gradient-to-b from-[#3b82f6]/50 to-transparent" />
                  <div className="absolute -left-[51px] top-4 w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  
                  <h3 className="text-sm font-medium text-[#3b82f6] flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4" /> AI Draft Quotation Prepared
                  </h3>
                  
                  <Card className="border-[#3b82f6]/20 bg-[#3b82f6]/[0.02] p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Suggested Reply</span>
                      <span className="text-[10px] text-white/30">AI confidence: {Math.round(workflow.steps.find((s: any) => s.stage === "GENERATE_QUOTATION")?.input_data?.confidence * 100) || 98}%</span>
                    </div>
                    
                    <div className="text-sm text-white/90 leading-relaxed bg-white/5 p-4 rounded-xl min-h-[140px] whitespace-pre-line font-sans">
                      {(() => {
                        const pendingApproval = workflow.approvals?.find((a: any) => a.status === 'PENDING' || a.status === 'pending');
                        const customerName = selectedEmail.sender.split(' ')[0] || 'Customer';
                        const productDesc = workflow.quotation?.items 
                          ? workflow.quotation.items.map((i: any) => `${i.quantity} units of ${i.product}`).join(', ')
                          : 'your requested products';
                        const totalAmount = workflow.quotation?.total_amount 
                          ? `$${workflow.quotation.total_amount.toLocaleString()}` 
                          : '$0.00';
                        
                        const suggestedBody = pendingApproval?.suggestedReply || pendingApproval?.suggested_reply || 
                          `Hi ${customerName},\n\nThanks for reaching out! I've analyzed your request and compiled a pricing quotation for you.\n\nWe have prepared quotation ${workflow.quotation?.quote_number} for ${productDesc}.\nThe total value is ${totalAmount}.\n\nLet me know if you would like me to finalize this order.\n\nBest regards,\nSales Agent | Automated Operations`;

                        return <Typewriter text={suggestedBody} delay={6} />;
                      })()}
                    </div>

                    {workflow.quotation && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Generated Attachment</span>
                        <Card className="bg-white/[0.01] border-white/5 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#ff5f57]/10 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-[#ff5f57]" />
                            </div>
                            <div>
                              <div className="text-xs text-white font-medium">{workflow.quotation.quote_number}.pdf</div>
                              <div className="text-[10px] text-white/40">Total Amount: ${workflow.quotation.total_amount.toLocaleString()}</div>
                            </div>
                          </div>
                          <Badge variant="success">Attach Ready</Badge>
                        </Card>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                      <button 
                        onClick={handleReject}
                        disabled={approving}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Reject Draft
                      </button>
                      <button 
                        onClick={handleApprove}
                        disabled={approving}
                        className="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-md shadow-blue-500/10 disabled:opacity-50"
                      >
                        {approving ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Approve & Send Email
                      </button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-white/35">
              Select an email from the inbox list to read it.
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
