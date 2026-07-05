import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Grid, LayoutDashboard, Inbox, UserPlus, Users, FileText, 
  CheckSquare, BarChart2, BookOpen, Bell, Settings, GitBranch, Menu, Search, LogOut
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { CommandPalette } from '../components/ui/CommandPalette';
import { mockApi } from '../services/mockApi';

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    mockApi.getWorkspace().then(workspace => {
      if (!workspace) {
        navigate('/onboarding');
      } else {
        setCompanyName(workspace.company_name);
        setIsLoading(false);
      }
    }).catch(e => {
      console.error(e);
      navigate('/onboarding');
    });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141416] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          <span className="text-xs text-white/45 tracking-wider font-medium">Loading operations dashboard...</span>
        </div>
      </div>
    );
  }
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: GitBranch, label: 'Workflow Timeline', path: '/dashboard/workflow' },
    { icon: Inbox, label: 'Email Inbox', path: '/dashboard/inbox' },
    { icon: UserPlus, label: 'Leads', path: '/dashboard/leads' },
    { icon: Users, label: 'Customers', path: '/dashboard/customers' },
    { icon: FileText, label: 'Quotations', path: '/dashboard/quotations' },
    { icon: CheckSquare, label: 'Approvals', path: '/dashboard/approvals' },
    { icon: BarChart2, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/dashboard/knowledge' },
    { icon: Bell, label: 'Notifications', path: '/dashboard/notifications' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' }
  ];

  return (
    <div className="flex h-screen w-full bg-[#151516] text-left font-sans text-white overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-[#1e1e21] flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-5 py-4 flex flex-col gap-6 flex-1 overflow-y-auto">
          
          <div className="flex items-center justify-between">
            <Link to="/" className="hover:opacity-80 transition-opacity" title="Back to Landing Page">
              <Logo className="w-5 h-5 text-white/70" />
            </Link>
            <Grid className="w-4 h-4 text-white/30" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#3b82f6] flex items-center justify-center text-xs font-bold text-white">
              {companyName ? companyName.charAt(0).toUpperCase() : 'W'}
            </div>
            <span className="text-xs text-white/80 font-medium">{companyName}</span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            {navItems.map((item, i) => (
              <NavLink 
                key={i} 
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white/80'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            ))}
            <hr className="border-white/5 my-4" />
            <button 
              onClick={async () => {
                const ok = window.confirm("Are you sure you want to logout? This resets the demo workspace profile.");
                if (!ok) return;
                try {
                  await mockApi.resetWorkspace();
                  localStorage.removeItem('onb_companyName');
                  localStorage.removeItem('onb_businessEmail');
                  localStorage.removeItem('onb_industry');
                  localStorage.removeItem('onb_catalogData');
                  localStorage.removeItem('onb_pricingData');
                  localStorage.removeItem('onb_googleClientId');
                  localStorage.removeItem('onb_googleClientSecret');
                  localStorage.removeItem('onb_googleRedirectUri');
                  window.location.href = '/';
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-[#ff5f57]/10 text-[#ff5f57]/80 hover:text-[#ff5f57] w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Desktop Header for Search */}
        <div className="hidden md:flex items-center justify-end px-8 py-4 border-b border-white/5 bg-[#1e1e21]">
          <button 
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/40 text-white/40 hover:text-white/80 px-3 py-1.5 rounded-lg border border-white/5 transition-colors text-xs font-medium"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] ml-2">⌘K</span>
          </button>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#1e1e21]">
          <Link to="/">
            <Logo className="w-5 h-5 text-white" />
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} className="text-white/70 hover:text-white">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-white/70 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
