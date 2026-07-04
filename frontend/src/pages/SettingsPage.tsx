import { User, Shield, Key, Bell, CreditCard } from 'lucide-react';

export function SettingsPage() {
  const tabs = [
    { name: 'Profile', icon: User, active: true },
    { name: 'Workspace', icon: Shield, active: false },
    { name: 'Integrations', icon: Key, active: false },
    { name: 'Billing', icon: CreditCard, active: false },
    { name: 'Notifications', icon: Bell, active: false },
  ];

  return (
    <div className="animate-fade-up max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
          <p className="text-sm text-white/40">Manage your account and workspace preferences.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {tabs.map((tab, i) => (
            <button key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${tab.active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <tab.icon className="w-4 h-4" /> {tab.name}
            </button>
          ))}
        </div>
        
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-lg font-medium text-white mb-6">Profile Information</h2>
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" defaultValue="Anand Admin" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" defaultValue="sales@flowops.ai" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
            </div>
            
            <hr className="border-white/10 my-4" />
            
            <div className="flex justify-end">
              <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
