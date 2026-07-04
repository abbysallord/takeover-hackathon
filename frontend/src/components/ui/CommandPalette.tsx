import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Inbox, Users, FileText, CheckSquare, BarChart2 } from 'lucide-react';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const items = [
    { name: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Email Inbox', path: '/dashboard/inbox', icon: Inbox },
    { name: 'Leads Pipeline', path: '/dashboard/leads', icon: Users },
    { name: 'Quotations', path: '/dashboard/quotations', icon: FileText },
    { name: 'Approval Center', path: '/dashboard/approvals', icon: CheckSquare },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart2 },
  ];

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101] px-4"
            >
              <div className="bg-[#1e1e21] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center px-4 py-3 border-b border-white/10">
                  <Search className="w-5 h-5 text-white/40 mr-3" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search anything..."
                    className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none text-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span className="text-[10px] text-white/40 font-medium px-2 py-1 bg-white/5 rounded">ESC</span>
                </div>
                
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredItems.length === 0 ? (
                    <div className="text-center text-white/40 py-8 text-sm">No results found.</div>
                  ) : (
                    filteredItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(item.path)}
                        className="w-full flex items-center px-4 py-3 text-left text-white/80 hover:text-white hover:bg-[#3b82f6] rounded-xl transition-colors group"
                      >
                        <item.icon className="w-5 h-5 mr-3 text-white/40 group-hover:text-white/80" />
                        <span className="font-medium">{item.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
