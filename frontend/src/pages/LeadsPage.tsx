import { useState, useEffect } from 'react';
import { Plus, Check, Trash, DollarSign } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form States for New Lead
  const [customerId, setCustomerId] = useState<string>('');
  const [leadValue, setLeadValue] = useState<number>(1000);
  const [leadStatus, setLeadStatus] = useState<string>('NEW');

  // Customer options
  const [createNewCustomer, setCreateNewCustomer] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');

  const columns = [
    { id: 'NEW', name: 'New Inbound' },
    { id: 'CONTACTED', name: 'AI Contacted' },
    { id: 'QUOTATION_SENT', name: 'Quote Sent' },
    { id: 'WON', name: 'Closed Won' },
    { id: 'LOST', name: 'Closed Lost' }
  ];

  const loadPipelineData = async () => {
    try {
      setIsLoading(true);
      const [leadsData, customersData] = await Promise.all([
        mockApi.getLeads(),
        mockApi.getCustomers()
      ]);
      setLeads(leadsData);
      setCustomers(customersData);
      if (customersData.length > 0) {
        setCustomerId(String(customersData[0].id));
        setCreateNewCustomer(false);
      } else {
        setCreateNewCustomer(true);
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load sales pipeline.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineData();
  }, []);

  const handleStatusChange = async (leadId: number, nextStatus: string) => {
    try {
      const res = await mockApi.updateLeadStatus(leadId, nextStatus);
      if (res) {
        toast(`Lead status updated to ${nextStatus}.`, 'success');
        loadPipelineData();
      } else {
        toast('Failed to update lead status.', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLead = async () => {
    let finalCustomerId = customerId;
    
    if (createNewCustomer) {
      if (!customerName || !customerEmail || !customerCompany) {
        toast('Please fill out all new customer details.', 'error');
        return;
      }
      
      try {
        const custRes = await mockApi.createCustomer({
          name: customerName,
          email: customerEmail,
          company: customerCompany
        });
        
        if (custRes && custRes.id) {
          finalCustomerId = String(custRes.id);
        } else {
          toast('Failed to register new customer.', 'error');
          return;
        }
      } catch (e) {
        console.error(e);
        toast('Error creating new customer.', 'error');
        return;
      }
    } else {
      if (!finalCustomerId) {
        toast('Please select a customer.', 'error');
        return;
      }
    }
    
    try {
      const payload = {
        customer_id: parseInt(finalCustomerId),
        value: Number(leadValue),
        status: leadStatus
      };
      const res = await mockApi.createLead(payload);
      if (res) {
        toast('Lead manually registered in pipeline!', 'success');
        setIsAddOpen(false);
        // Reset form inputs
        setCustomerName('');
        setCustomerEmail('');
        setCustomerCompany('');
        loadPipelineData();
      } else {
        toast('Failed to create lead.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error creating lead.', 'error');
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await mockApi.deleteLead(leadId);
      if (res) {
        toast('Lead deleted from pipeline.', 'success');
        loadPipelineData();
      } else {
        toast('Failed to delete lead.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error deleting lead.', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-full animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Leads Pipeline</h1>
            <p className="text-sm text-white/40">Manage and track your AI-driven sales pipeline.</p>
          </div>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center sm:justify-start gap-2 transition-colors w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 flex-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 pb-4 flex-1">
            {columns.map((col) => {
              const colLeads = leads.filter(l => l.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4 min-h-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="font-semibold text-white/95 text-xs uppercase tracking-wider">{col.name}</h3>
                    <Badge variant="neutral">{colLeads.length}</Badge>
                  </div>
                  
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-20rem)] pr-1">
                    {colLeads.length === 0 ? (
                      <div className="text-[10px] text-white/20 text-center py-8 italic">No deals</div>
                    ) : (
                      colLeads.map((lead) => (
                        <div 
                          key={lead.id}
                          className="bg-white/5 border border-white/10 p-4 rounded-xl hover:border-white/20 transition-colors flex flex-col gap-3 relative group"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                              {lead.customer?.company || lead.customer?.name || 'Customer'}
                            </span>
                            
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className="text-[10px] bg-white/10 border border-white/10 rounded px-1 py-0.5 text-white/80 outline-none cursor-pointer focus:ring-1 focus:ring-white/20"
                            >
                              <option value="NEW">New</option>
                              <option value="CONTACTED">Contacted</option>
                              <option value="QUOTATION_SENT">Sent</option>
                              <option value="WON">Won</option>
                              <option value="LOST">Lost</option>
                            </select>
                          </div>
                          <div className="text-[10px] text-white/40 -mt-2">
                            Contact: {lead.customer?.name || 'Unknown'}
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                            <span className="text-xs font-bold text-white/90">
                              ${lead.value.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={lead.value > 5000 ? 'warning' : 'neutral'}>
                                {lead.value > 5000 ? 'High Value' : 'Standard'}
                              </Badge>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-white/30 hover:text-[#ff5f57] opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-white/5 rounded"
                                title="Delete Lead"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Lead Dialog */}
        <Dialog
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Manual Lead"
          onConfirm={handleCreateLead}
          confirmText="Register Lead"
        >
          <div className="flex flex-col gap-4 text-xs">
            {/* Customer Mode Selection */}
            {customers.length > 0 && (
              <div className="flex gap-4 mb-1">
                <label className="flex items-center gap-1.5 text-white/60 hover:text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    checked={!createNewCustomer}
                    onChange={() => setCreateNewCustomer(false)}
                    className="accent-[#3b82f6]"
                  />
                  <span>Select Existing</span>
                </label>
                <label className="flex items-center gap-1.5 text-white/60 hover:text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    checked={createNewCustomer}
                    onChange={() => setCreateNewCustomer(true)}
                    className="accent-[#3b82f6]"
                  />
                  <span>Create New</span>
                </label>
              </div>
            )}

            {!createNewCustomer ? (
              <div>
                <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Select Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
                >
                  {customers.length === 0 ? (
                    <option value="">No registered customers found</option>
                  ) : (
                    customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || 'Private'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#3b82f6] block">New Customer Details</span>
                <div>
                  <label className="text-[9px] uppercase font-semibold text-white/40 block mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:ring-1 focus:ring-white/20 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-semibold text-white/40 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@company.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:ring-1 focus:ring-white/20 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-semibold text-white/40 block mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Wayne Enterprises"
                    value={customerCompany}
                    onChange={e => setCustomerCompany(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:ring-1 focus:ring-white/20 text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Estimated Deal Value (USD)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={leadValue}
                  onChange={e => setLeadValue(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Initial Pipeline Stage</label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="NEW">New Inbound</option>
                <option value="CONTACTED">AI Contacted</option>
                <option value="QUOTATION_SENT">Quote Sent</option>
                <option value="WON">Closed Won</option>
                <option value="LOST">Closed Lost</option>
              </select>
            </div>
          </div>
        </Dialog>
      </div>
    </PageTransition>
  );
}
