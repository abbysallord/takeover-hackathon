import { useState, useEffect } from 'react';
import { Timeline } from '../components/ui/Timeline';
import type { TimelineStep } from '../components/ui/Timeline';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Search, Mail, FileText, CheckCircle2, RotateCw } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';
import { useToast } from '../components/ui/ToastContext';

import { useLocation } from 'react-router-dom';

export function WorkflowTimelinePage() {
  const { toast } = useToast();
  const location = useLocation();
  const routeState = location.state as { workflowId?: number } | null;

  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEnquiries = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getEmails();
      // Filter inbound emails
      const inbound = data.filter((e: any) => e.direction === "INBOUND");
      setEnquiries(inbound);
      
      const targetWorkflowId = routeState?.workflowId;
      if (targetWorkflowId) {
        const wfs = await mockApi.getWorkflows();
        const wf = wfs.find((w: any) => w.id === targetWorkflowId);
        if (wf && wf.email_id) {
          setSelectedId(wf.email_id);
          const email = inbound.find((e: any) => e.id === wf.email_id);
          if (email) setSelectedEnquiry(email);
          return;
        }
      }

      if (inbound.length > 0) {
        setSelectedId(inbound[0].id);
        setSelectedEnquiry(inbound[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      const email = enquiries.find(e => e.id === selectedId);
      if (email) setSelectedEnquiry(email);
      
      mockApi.getWorkflowByEmailId(selectedId).then(wf => {
        setWorkflow(wf);
      });
    }
  }, [selectedId, enquiries]);

  const filteredEnquiries = enquiries.filter(e => 
    e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Map backend steps into TimelineStep format
  const timelineSteps: TimelineStep[] = workflow && workflow.steps ? workflow.steps.map((step: any) => {
    let stepTitle = step.stage;
    if (step.stage === "EMAIL_RECEIVED") {
      stepTitle = "Reading Email & Understanding Intent";
    } else if (step.stage === "RETRIEVE_PRICING" && step.input_data?.tool === "rag_tool") {
      stepTitle = "Searching Knowledge Base (RAG)";
    } else if (step.stage === "RETRIEVE_PRICING" && step.input_data?.tool === "pricing_tool") {
      stepTitle = "Calculating Pricing & Discount";
    } else if (step.stage === "CHECK_INVENTORY") {
      stepTitle = "Checking Inventory Stock";
    } else if (step.stage === "GENERATE_QUOTATION") {
      stepTitle = "Generating Quotation PDF";
    } else if (step.stage === "REQUEST_APPROVAL") {
      stepTitle = "Waiting for Manager Approval";
    } else if (step.stage === "SEND_REPLY") {
      stepTitle = "Sending Response Email";
    } else if (step.stage === "CREATE_LEAD") {
      stepTitle = "Creating CRM Lead";
    } else if (step.stage === "SCHEDULE_FOLLOWUP") {
      stepTitle = "Scheduling Follow-up Calendar invite";
    } else if (step.stage === "COMPLETED") {
      stepTitle = "Completed";
    }

    let status: 'completed' | 'processing' | 'pending' | 'failed' = 'pending';
    if (step.status === "COMPLETED") status = 'completed';
    else if (step.status === "RUNNING") status = 'processing';
    else if (step.status === "FAILED") status = 'failed';

    const timestamp = new Date(step.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let content = null;
    if (step.status === "COMPLETED" || step.status === "RUNNING") {
      if (step.stage === "EMAIL_RECEIVED") {
        content = (
          <Card className="bg-white/[0.01] border-white/5">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-white/40 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-white/70 italic">"{selectedEnquiry?.body || "Email body..."}"</p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="neutral">Inbound Inquiry</Badge>
                  <Badge variant="neutral">Sender: {selectedEnquiry?.sender}</Badge>
                </div>
              </div>
            </div>
          </Card>
        );
      } else if (step.stage === "RETRIEVE_PRICING" && step.input_data?.tool === "rag_tool") {
        content = (
          <div className="text-xs text-white/50 bg-white/5 px-3 py-2 rounded-md flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#28c840]" />
              <span>RAG Knowledge Retrieval Complete (Confidence: {Math.round(step.input_data.confidence * 100)}%)</span>
            </div>
            {step.output_data?.tool_output?.context && (
              <p className="text-[10px] text-white/35 font-mono line-clamp-3 leading-relaxed mt-1 border-t border-white/5 pt-1.5">
                {step.output_data.tool_output.context}
              </p>
            )}
          </div>
        );
      } else if (step.stage === "CHECK_INVENTORY") {
        content = (
          <div className="text-xs text-white/50 bg-white/5 px-3 py-2 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#28c840]" />
            <span>{step.output_data?.tool_output?.message || "Stock verified."}</span>
          </div>
        );
      } else if (step.stage === "GENERATE_QUOTATION" && workflow.quotation) {
        content = (
          <Card className="bg-white/[0.01] border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#ff5f57]/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#ff5f57]" />
                </div>
                <div>
                  <div className="text-xs text-white font-medium">{workflow.quotation.quote_number}.pdf</div>
                  <div className="text-[10px] text-white/40">Total Amount: ${workflow.quotation.total_amount.toLocaleString()}</div>
                </div>
              </div>
              <Badge variant="success">Drafted</Badge>
            </div>
          </Card>
        );
      } else if (step.stage === "REQUEST_APPROVAL") {
        const isApproved = workflow.status === "COMPLETED" || workflow.current_stage !== "REQUEST_APPROVAL";
        content = (
          <div className="text-xs text-white/50 bg-white/5 px-3 py-2 rounded-md flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isApproved ? 'text-[#28c840]' : 'text-[#ff9f0a]'}`} />
            <span>{isApproved ? 'Manager Approval Granted' : 'Awaiting Review in Approval Center'}</span>
          </div>
        );
      } else {
        content = (
          <p className="text-[11px] text-white/40 leading-relaxed italic">"{step.input_data?.reasoning || "Reasoning logged."}"</p>
        );
      }
    }

    return {
      title: stepTitle,
      description: step.input_data?.reasoning || "Step execution detail...",
      status: status,
      timestamp: timestamp,
      content: content
    };
  }) : [];

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-4 md:gap-6 -mt-4">
        {/* Sidebar List */}
        <div className="w-full md:w-80 flex flex-col gap-4 md:border-r border-b md:border-b-0 border-white/5 pb-4 md:pb-0 md:pr-6 flex-shrink-0 h-[40%] md:h-auto">
          <h2 className="text-lg font-medium text-white mb-2">Active Workflows</h2>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search enquiries..." 
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
            ) : filteredEnquiries.length === 0 ? (
              <div className="text-center py-8 text-xs text-white/40">No active workflows found.</div>
            ) : (
              filteredEnquiries.map(enq => {
                const isSelected = selectedId === enq.id;
                return (
                  <div 
                    key={enq.id}
                    onClick={() => setSelectedId(enq.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] text-white/40">{new Date(enq.received_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xs text-white font-medium line-clamp-2 leading-relaxed">{enq.subject}</h3>
                    <span className="text-[10px] text-white/40 mt-1 block truncate">From: {enq.sender}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Timeline View */}
        <div className="flex-1 flex flex-col md:pl-2 overflow-y-auto pt-4 md:pt-0">
          {selectedEnquiry ? (
            <div className="max-w-2xl">
              <div className="mb-8">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-white">{selectedEnquiry.subject}</h1>
                    <Badge variant={workflow?.status === 'COMPLETED' ? 'success' : (workflow?.status === 'PENDING_APPROVAL' ? 'warning' : 'processing')}>
                      {workflow?.status || 'Processing'}
                    </Badge>
                  </div>
                  {workflow && (
                    <button
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const res = await mockApi.rerunWorkflow(workflow.id);
                          if (res) {
                            toast("Workflow execution restarted successfully!", "success");
                            loadEnquiries();
                          } else {
                            toast("Failed to restart workflow.", "error");
                          }
                        } catch (e) {
                          console.error(e);
                          toast("Rerun connection error.", "error");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rerun Workflow
                    </button>
                  )}
                </div>
                <p className="text-xs text-white/40">From: {selectedEnquiry.sender} • Tracking the autonomous agentic execution stages.</p>
              </div>

              {workflow ? (
                <Timeline steps={timelineSteps} />
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/40 py-4">
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Loading workflow orchestration state...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-white/35">
              Select an enquiry to track its execution steps.
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
