import { useState, useEffect } from 'react';
import { Search, Download, Filter, User, Plus } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { PageTransition } from '../components/PageTransition';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { mockApi } from '../services/mockApi';

export function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');

  // Add Customer State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', company: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getCustomers();
      
      // Let's augment customer records with simulated MRR, workflows, and health
      const augmented = data.map((c: any) => {
        // Deterministic stats tied to the customer ID
        const workflowCount = (c.id * 7) % 19 + 2;
        const mrrVal = (c.id * 1500) % 8000 + 500;
        const healths = ['excellent', 'good', 'fair'];
        const health = healths[c.id % healths.length];

        return {
          id: c.id,
          company: c.company || 'Private Buyer',
          name: c.name,
          email: c.email,
          mrr: `$${mrrVal.toLocaleString()}`,
          health: health,
          workflows: workflowCount
        };
      });

      setCustomers(augmented);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleExport = () => {
    if (customers.length === 0) return;
    const headers = ["Company", "Contact Name", "Email Address", "MRR", "Health Score", "Active Workflows"];
    const rows = filteredCustomers.map(c => [
      c.company,
      c.name,
      c.email,
      c.mrr,
      c.health,
      c.workflows
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "workspace_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast("Name and email are required.", "error");
      return;
    }
    try {
      setIsSaving(true);
      const res = await mockApi.createCustomer(newCustomer);
      if (res) {
        toast("Customer added successfully!", "success");
        setIsAddOpen(false);
        setNewCustomer({ name: '', email: '', company: '' });
        loadCustomers();
      } else {
        toast("Failed to add customer. Email might already exist.", "error");
      }
    } catch (e) {
      console.error(e);
      toast("Error adding customer.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (healthFilter === 'ALL') return matchesSearch;
    return matchesSearch && c.health === healthFilter.toLowerCase();
  });

  return (
    <PageTransition>
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Customers Base</h1>
            <p className="text-sm text-white/40">View and manage your active customer base.</p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-lg text-xs font-medium border border-white/10 outline-none cursor-pointer"
            >
              <option value="ALL">Show All Health</option>
              <option value="EXCELLENT">Excellent Health</option>
              <option value="GOOD">Good Health</option>
              <option value="FAIR">Fair Health</option>
            </select>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
            <button 
              onClick={handleExport}
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-x-auto">
          <div className="p-4 border-b border-white/10 flex items-center gap-3 min-w-[600px]">
            <Search className="w-4 h-4 text-white/40" />
            <input 
              type="text" 
              placeholder="Search customers by company, name, or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full" 
            />
          </div>
          
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-white/5 text-xs text-white/40 uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Company</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">MRR Allocation</th>
                <th className="px-6 py-4 font-medium">Health Score</th>
                <th className="px-6 py-4 font-medium">Active Workflows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4 h-12 bg-white/5 animate-pulse" />
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-white/40">No customers found matching search criteria.</td>
                </tr>
              ) : (
                filteredCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-white">{c.company}</td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-white/30">{c.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/90">{c.mrr}</td>
                    <td className="px-6 py-4">
                      <Badge variant={c.health === 'excellent' ? 'success' : c.health === 'good' ? 'processing' : 'warning'}>
                        {c.health}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">{c.workflows}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Customer Modal */}
        <Dialog
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add New Customer"
          onConfirm={handleAddCustomer}
          confirmText={isSaving ? "Saving..." : "Save Customer"}
        >
          <div className="flex flex-col gap-4 text-xs text-white/80">
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1 block">Full Name</label>
              <input 
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="Jane Doe"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1 block">Email Address</label>
              <input 
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="jane@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1 block">Company (Optional)</label>
              <input 
                type="text"
                value={newCustomer.company}
                onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                placeholder="Acme Corp"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/20"
              />
            </div>
          </div>
        </Dialog>
      </div>
    </PageTransition>
  );
}
