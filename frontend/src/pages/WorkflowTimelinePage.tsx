import { useState } from 'react';
import { Timeline } from '../components/ui/Timeline';
import type { TimelineStep } from '../components/ui/Timeline';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Search, Mail, FileText, CheckCircle2 } from 'lucide-react';

export function WorkflowTimelinePage() {
  const [selectedId, setSelectedId] = useState(1);

  const enquiries = [
    { id: 1, subject: 'Enterprise License Quote - Acme Corp', time: '10 mins ago', status: 'processing' },
    { id: 2, subject: 'Server Rack Specifications', time: '1 hour ago', status: 'pending' },
    { id: 3, subject: 'Software License Renewal', time: '3 hours ago', status: 'completed' },
  ];

  const timelineSteps: TimelineStep[] = [
    {
      title: 'Information Extraction',
      description: 'Parsed customer requirements and intent from the inbound email.',
      status: 'completed',
      timestamp: '10:05 AM',
      content: (
        <Card className="bg-white/[0.01]">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-white/40 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/70 italic">"Hi team, we are looking to upgrade to the Enterprise tier for 500 users. Could you send us a formal quote and details on the SSO integration?"</p>
              <div className="mt-3 flex gap-2">
                <Badge variant="neutral">Intent: Upgrade</Badge>
                <Badge variant="neutral">Users: 500</Badge>
                <Badge variant="neutral">Tier: Enterprise</Badge>
              </div>
            </div>
          </div>
        </Card>
      )
    },
    {
      title: 'Knowledge Retrieval (RAG)',
      description: 'Searched internal knowledge base for "Enterprise SSO Integration".',
      status: 'completed',
      timestamp: '10:06 AM',
      content: (
        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 px-3 py-2 rounded-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#28c840]" />
          Found 3 related articles (Confidence: 98%)
        </div>
      )
    },
    {
      title: 'Quotation Generation',
      description: 'Drafting PDF quote based on standard pricing models.',
      status: 'processing',
      timestamp: '10:07 AM',
      content: (
        <Card className="bg-white/[0.01] border border-[#3b82f6]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#ff5f57]/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#ff5f57]" />
              </div>
              <div>
                <div className="text-xs text-white font-medium">Acme_Enterprise_Quote.pdf</div>
                <div className="text-[10px] text-white/40">Generating...</div>
              </div>
            </div>
            <div className="w-4 h-4 border-2 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
          </div>
        </Card>
      )
    },
    {
      title: 'Manager Approval',
      description: 'Awaiting human review before sending out the automated email and quote.',
      status: 'pending'
    },
    {
      title: 'CRM Lead Creation',
      description: 'Logging the opportunity and activity in Salesforce.',
      status: 'pending'
    }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 -mt-4">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col gap-4 border-r border-white/5 pr-6">
        <h2 className="text-lg font-medium text-white mb-2">Active Workflows</h2>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Search enquiries..." 
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <div className="flex flex-col gap-2 mt-2 overflow-y-auto pr-2">
          {enquiries.map(enq => (
            <div 
              key={enq.id}
              onClick={() => setSelectedId(enq.id)}
              className={`p-4 rounded-xl cursor-pointer transition-colors border ${selectedId === enq.id ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant={enq.status === 'processing' ? 'processing' : enq.status === 'completed' ? 'success' : 'neutral'}>
                  {enq.status}
                </Badge>
                <span className="text-[10px] text-white/40">{enq.time}</span>
              </div>
              <h3 className="text-sm text-white font-medium line-clamp-2">{enq.subject}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Main Timeline View */}
      <div className="flex-1 flex flex-col pl-2 overflow-y-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-white">Enterprise License Quote - Acme Corp</h1>
            <Badge variant="processing">Processing</Badge>
          </div>
          <p className="text-sm text-white/50">Tracking the automated lifecycle of this enquiry.</p>
        </div>

        <div className="max-w-2xl">
          <Timeline steps={timelineSteps} />
        </div>
      </div>
    </div>
  );
}
