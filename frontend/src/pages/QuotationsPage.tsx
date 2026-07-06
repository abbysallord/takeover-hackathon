import { useState, useEffect } from 'react';
import { FileText, Send, Eye, DollarSign, Calendar, RefreshCw, Search, Download } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/ToastContext';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function QuotationsPage() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadQuotations = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getQuotations();
      setQuotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const handleExport = () => {
    if (quotes.length === 0) return;
    const headers = ["Quote Number", "Client Name", "Total Amount (USD)", "Items Count", "Date Created"];
    const rows = filteredQuotes.map(q => [
      q.quote_number,
      q.client_name || 'Private Client',
      q.total_amount,
      q.items ? q.items.length : 0,
      new Date(q.created_at).toLocaleDateString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_quotations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredQuotes = quotes.filter(q => {
    const term = searchQuery.toLowerCase();
    return (
      q.quote_number.toLowerCase().includes(term) ||
      (q.client_name || '').toLowerCase().includes(term)
    );
  });

  const handleOpenDetails = (quote: any) => {
    setSelectedQuote(quote);
    setIsOpen(true);
  };

  const handleSendQuote = async (quote: any) => {
    try {
      const success = await mockApi.sendQuotation(quote.id);
      if (success) {
        toast(`Quotation ${quote.quote_number} has been dispatched successfully!`, 'success');
      } else {
        toast(`Failed to dispatch Quotation ${quote.quote_number}`, 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to send quotation.', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Quotations</h1>
            <p className="text-sm text-white/40">Manage your AI-generated PDF quotes.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
              onClick={loadQuotations}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6">
          <Search className="w-4 h-4 text-white/40" />
          <input 
            type="text" 
            placeholder="Search quotations by client name or quote number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-full" 
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-white/70">No quotations found</h3>
            <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">No quotes match your search criteria or none have been generated yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredQuotes.map((q) => (
              <div 
                key={q.id} 
                className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {q.client_name || 'Private Client'} 
                      <span className="text-xs text-white/40 font-normal">{q.quote_number}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">Generated {new Date(q.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-12 justify-between w-full md:w-auto">
                  <div className="text-left md:text-right">
                    <div className="text-sm font-semibold text-white">${q.total_amount.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Total Value</div>
                  </div>
                  
                  <div className="w-24 flex justify-end">
                    {q.discount_amount > 0 ? (
                      <Badge variant="success">Discount Applied</Badge>
                    ) : (
                      <Badge variant="neutral">Standard Price</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenDetails(q)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleSendQuote(q)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Resend to Client"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Quotation Details Modal */}
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={`Quotation Details - ${selectedQuote?.quote_number}`}
          onConfirm={() => setIsOpen(false)}
          confirmText="Done"
        >
          {selectedQuote && (() => {
            const subtotal = selectedQuote.items 
              ? selectedQuote.items.reduce((acc: number, item: any) => acc + (item.quantity * (item.unit_price || 0)), 0)
              : selectedQuote.total_amount;
            const discount_amount = subtotal - selectedQuote.total_amount;
            return (
              <div className="flex flex-col gap-6 text-xs text-white/80">
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <div>
                    <div className="text-sm font-bold text-white mb-1">{selectedQuote.client_name || 'Client'}</div>
                    <div className="text-[10px] text-white/40">Sales Quotation Document</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40 flex items-center gap-1.5 justify-end">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(selectedQuote.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">Status: Active Draft</div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-2 tracking-wider">Line Items</label>
                  <div className="bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                      <thead>
                        <tr className="bg-white/5 text-[10px] text-white/40 uppercase tracking-wider">
                          <th className="px-4 py-2 font-medium">Product</th>
                          <th className="px-4 py-2 font-medium text-center">Qty</th>
                          <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                          <th className="px-4 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedQuote.items && selectedQuote.items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-medium text-white">{item.product}</td>
                            <td className="px-4 py-2 text-center text-white/60">{item.quantity}</td>
                            <td className="px-4 py-2 text-right text-white/60">${(item.unit_price || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-white font-medium">${((item.quantity * (item.unit_price || 0))).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Calculation summary */}
                <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/10 max-w-sm self-end w-full">
                  <div className="flex justify-between">
                    <span className="text-white/40">Subtotal:</span>
                    <span className="font-medium text-white">${subtotal.toLocaleString()}</span>
                  </div>
                  {discount_amount > 0 && (
                    <div className="flex justify-between text-[#28c840]">
                      <span>Volume Discount:</span>
                      <span>-${discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                    <span>Grand Total (USD):</span>
                    <span>${selectedQuote.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </Dialog>
      </div>
    </PageTransition>
  );
}
