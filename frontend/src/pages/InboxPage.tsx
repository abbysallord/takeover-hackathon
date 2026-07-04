import { useState } from 'react';
import { Mail, Search, FileText, CheckCircle2, Edit3, Send, User, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export function InboxPage() {
  const [selectedId, setSelectedId] = useState(1);

  const emails = [
    {
      id: 1,
      sender: 'Sarah Jenkins',
      company: 'Acme Corp',
      subject: 'Enterprise License Quote',
      preview: 'Hi team, we are looking to upgrade to the Enterprise tier for 500 users...',
      time: '10:05 AM',
      status: 'pending_approval'
    },
    {
      id: 2,
      sender: 'David Chen',
      company: 'TechFlow',
      subject: 'Server Rack Specifications',
      preview: 'Could you send over the detailed specs for the XR-900 series?',
      time: 'Yesterday',
      status: 'processing'
    },
    {
      id: 3,
      sender: 'Amanda Torres',
      company: 'Global Retail',
      subject: 'Software License Renewal',
      preview: 'Our current license expires next month. What are the renewal options?',
      time: 'Oct 23',
      status: 'completed'
    }
  ];

  const selectedEmail = emails.find(e => e.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 -mt-4">
      {/* Left Pane: Email List */}
      <div className="w-80 flex flex-col gap-4 border-r border-white/5 pr-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-white">Inbox</h2>
          <Badge variant="neutral">3 New</Badge>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Search emails..." 
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <div className="flex flex-col gap-2 mt-2 overflow-y-auto pr-2">
          {emails.map(email => (
            <div 
              key={email.id}
              onClick={() => setSelectedId(email.id)}
              className={`p-4 rounded-xl cursor-pointer transition-colors border ${selectedId === email.id ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-white truncate pr-2">{email.sender}</span>
                <span className="text-[10px] text-white/40 flex-shrink-0 mt-0.5">{email.time}</span>
              </div>
              <h3 className="text-xs text-white/80 font-medium line-clamp-1 mb-1">{email.subject}</h3>
              <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">{email.preview}</p>
              
              <div className="mt-3">
                {email.status === 'pending_approval' && <Badge variant="warning">Requires Approval</Badge>}
                {email.status === 'processing' && <Badge variant="processing">AI Processing</Badge>}
                {email.status === 'completed' && <Badge variant="success">Replied</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Pane: Email Detail & AI Draft */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-4">
        {selectedEmail ? (
          <div className="max-w-3xl animate-fade-up">
            
            {/* Original Email Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-white mb-6">{selectedEmail.subject}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{selectedEmail.sender} <span className="text-white/40 font-normal">&lt;{selectedEmail.sender.split(' ')[0].toLowerCase()}@{selectedEmail.company.replace(' ', '').toLowerCase()}.com&gt;</span></div>
                  <div className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                    <span>To: sales@flowops.ai</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{selectedEmail.time}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-white/70 leading-relaxed bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                Hi team,<br /><br />
                {selectedEmail.preview}<br /><br />
                We are hoping to finalize this by end of week.<br /><br />
                Best,<br />
                {selectedEmail.sender}<br />
                Operations | {selectedEmail.company}
              </div>
            </div>

            {/* AI Draft Response Section */}
            {selectedEmail.status === 'pending_approval' && (
              <div className="mt-12 relative">
                <div className="absolute -left-12 top-0 bottom-0 w-px bg-gradient-to-b from-[#3b82f6]/50 to-transparent" />
                <div className="absolute -left-[51px] top-4 w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                
                <h3 className="text-sm font-medium text-[#3b82f6] flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4" /> AI Draft Prepared
                </h3>
                
                <Card className="border-[#3b82f6]/20 bg-[#3b82f6]/[0.02]">
                  <div className="mb-4">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Suggested Reply</span>
                  </div>
                  
                  <div className="text-sm text-white/90 leading-relaxed mb-6 bg-white/5 p-4 rounded-xl">
                    Hi {selectedEmail.sender.split(' ')[0]},<br /><br />
                    Thanks for reaching out! We'd be thrilled to have {selectedEmail.company} on our Enterprise tier.<br /><br />
                    I have attached a formal quotation for 500 users as requested. Regarding your question on SSO integration, our Enterprise tier fully supports SAML 2.0 (Okta, Azure AD, etc.) and it can be configured in minutes via the admin dashboard.<br /><br />
                    Let me know if you need any adjustments to the quote before Friday.<br /><br />
                    Best,<br />
                    Sales Team | FlowOps
                  </div>

                  <div className="mb-6">
                    <span className="text-xs text-white/40 uppercase tracking-wider font-medium block mb-3">Generated Attachments</span>
                    <div className="flex items-center gap-3 bg-white/5 w-fit px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                      <FileText className="w-5 h-5 text-[#ff5f57]" />
                      <div>
                        <div className="text-xs font-medium text-white">{selectedEmail.company.replace(' ', '_')}_Enterprise_Quote.pdf</div>
                        <div className="text-[10px] text-white/40">142 KB</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <button className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Approve & Send
                    </button>
                    <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2.5 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" /> Edit Draft
                    </button>
                  </div>
                </Card>
              </div>
            )}
            
            {selectedEmail.status === 'processing' && (
              <div className="mt-12 flex flex-col items-center justify-center py-12 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="w-12 h-12 rounded-full border-2 border-[#3b82f6]/30 border-t-[#3b82f6] animate-spin mb-4" />
                <h3 className="text-sm font-medium text-white mb-1">AI is processing...</h3>
                <p className="text-xs text-white/40">Extracting intent and drafting response.</p>
              </div>
            )}
            
            {selectedEmail.status === 'completed' && (
              <div className="mt-12 flex items-center gap-3 bg-[#28c840]/10 border border-[#28c840]/20 p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#28c840]" />
                <div className="text-sm text-[#28c840]">Response successfully approved and sent. CRM updated.</div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center h-full">
            <Mail className="w-12 h-12 text-white/10 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No email selected</h3>
            <p className="text-sm text-white/40">Select an email from the list to view the AI workflow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
