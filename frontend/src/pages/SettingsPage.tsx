import { useState, useEffect } from 'react';
import { User, Shield, Key, Bell, CreditCard, RotateCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/ui/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { mockApi } from '../services/mockApi';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Profile');
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // WhatsApp Integration States
  const [waConnected, setWaConnected] = useState(false);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPhone, setWaPhone] = useState<string | null>(null);

  const checkWhatsAppStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/auth/qr');
      const data = await res.json();
      setWaConnected(data.connected);
      setWaQr(data.qr);
      if (data.connected) {
        const statusRes = await fetch('http://localhost:3000/auth/status');
        const statusData = await statusRes.json();
        setWaPhone(statusData.phone);
      }
    } catch (e) {
      // Quietly ignore if sidecar is not running
      setWaConnected(false);
      setWaQr(null);
    }
  };

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('');

  const tabs = [
    { name: 'Profile', icon: User },
    { name: 'Workspace', icon: Shield },
    { name: 'Integrations', icon: Key },
    { name: 'Billing', icon: CreditCard },
  ];

  const loadWorkspace = async () => {
    try {
      setIsLoading(true);
      const res = await mockApi.getWorkspace();
      if (res) {
        setWorkspace(res);
        setCompanyName(res.company_name);
        setBusinessEmail(res.business_email);
        setIndustry(res.industry);
        setGoogleClientId(res.google_client_id || '');
        setGoogleClientSecret(res.google_client_secret || '');
        setGoogleRedirectUri(res.google_redirect_uri || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('gmail_connected');
    const err = params.get('error');

    if (connected === 'true') {
      setActiveTab('Integrations');
      toast('Gmail connected successfully via Google OAuth!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (err) {
      setActiveTab('Integrations');
      toast(`OAuth connection failed: ${err}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeTab === 'Integrations') {
      checkWhatsAppStatus();
      interval = setInterval(checkWhatsAppStatus, 5000);
    } else {
      setWaQr(null);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSave = async () => {
    if (!companyName || !companyName.trim()) {
      toast('Company Name cannot be empty.', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        company_name: companyName,
        business_email: businessEmail,
        industry: industry,
        gmail_connected: workspace?.gmail_connected || false,
        catalog_data: workspace?.catalog_data || '',
        pricing_data: workspace?.pricing_data || '',
        google_client_id: googleClientId,
        google_client_secret: googleClientSecret,
        google_redirect_uri: googleRedirectUri
      };
      
      const res = await mockApi.setupWorkspace(payload);
      if (res) {
        setWorkspace(res);
        toast('Settings updated successfully.', 'success');
      } else {
        toast('Failed to save settings.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Error saving configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      // First save current IDs
      await handleSave();
      
      const res = await mockApi.getGoogleAuthUrl();
      if (res && res.auth_url) {
        toast('Redirecting to Google OAuth...', 'success');
        window.location.href = res.auth_url;
      } else {
        toast('Failed to generate authorization URL.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('OAuth generation failed.', 'error');
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const payload = {
        company_name: companyName,
        business_email: businessEmail,
        industry: industry,
        gmail_connected: false,
        catalog_data: workspace?.catalog_data || '',
        pricing_data: workspace?.pricing_data || '',
        google_client_id: googleClientId,
        google_client_secret: googleClientSecret,
        google_redirect_uri: googleRedirectUri
      };
      const res = await mockApi.setupWorkspace(payload);
      if (res) {
        setWorkspace(res);
        toast('Gmail inbox disconnected.', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetWorkspace = () => {
    setIsConfirmOpen(true);
  };

  const executeReset = async () => {
    try {
      setIsSaving(true);
      await mockApi.resetWorkspace();
      localStorage.removeItem('onb_companyName');
      localStorage.removeItem('onb_businessEmail');
      localStorage.removeItem('onb_industry');
      localStorage.removeItem('onb_catalogData');
      localStorage.removeItem('onb_pricingData');
      localStorage.removeItem('onb_googleClientId');
      localStorage.removeItem('onb_googleClientSecret');
      localStorage.removeItem('onb_googleRedirectUri');
      localStorage.removeItem('flow_session_id');
      toast('Workspace reset complete.', 'success');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      toast('Failed to reset workspace.', 'error');
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <PageTransition>
      <div className="animate-fade-up max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
            <p className="text-sm text-white/40">Manage your profile, credentials, and workspace preferences.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Subtabs Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            {tabs.map((tab, i) => {
              const isActive = activeTab === tab.name;
              return (
                <button 
                  key={i} 
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.name}
                </button>
              );
            })}
            <hr className="border-white/10 my-4" />
            <button 
              onClick={handleResetWorkspace}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#ff5f57] hover:bg-[#ff5f57]/10 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" /> Reset Workspace
            </button>
          </div>
          
          {/* Tab Contents */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-xs text-white/40">
                <RotateCw className="w-5 h-5 animate-spin mr-2" /> Loading preferences...
              </div>
            ) : (
              <>
                {activeTab === 'Profile' && (
                  <div>
                    <h2 className="text-lg font-medium text-white mb-6">Profile Details</h2>
                    <div className="flex flex-col gap-6 text-xs text-white/80">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Workspace Administrator</label>
                        <input 
                          type="text" 
                          readOnly 
                          value="Operations Manager"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/50 focus:outline-none cursor-default" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Connected Business Email</label>
                        <input 
                          type="email" 
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20" 
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Workspace' && (
                  <div>
                    <h2 className="text-lg font-medium text-white mb-6">Workspace Configuration</h2>
                    <div className="flex flex-col gap-6 text-xs text-white/80">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Company Name</label>
                        <input 
                          type="text" 
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          maxLength={80}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Business Industry</label>
                        <input 
                          type="text" 
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Default Currency</label>
                        <select
                          value={localStorage.getItem('defaultCurrency') || 'USD'}
                          onChange={(e) => {
                            localStorage.setItem('defaultCurrency', e.target.value);
                            // Force re-render for local state update just for the select visually
                            setCompanyName(companyName); 
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 outline-none cursor-pointer"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                        <span className="text-[10px] text-white/30 mt-2 block">
                          This preference is stored locally and applies to dashboard metrics.
                        </span>
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save Workspace"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Integrations' && (
                  <div>
                    <h2 className="text-lg font-medium text-white mb-6">Integrations & Credentials</h2>
                    
                    <div className="flex flex-col gap-6 text-xs text-white/80">
                      {/* Gmail Inbox Connection status */}
                      <Card className="p-5 border-white/10 bg-white/[0.01] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded bg-white/5 flex items-center justify-center ${workspace?.gmail_connected ? 'text-[#28c840]' : 'text-white/30'}`}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-white font-semibold">Gmail Inbox Synchronization</div>
                            <div className="text-[10px] text-white/40 mt-0.5">
                              {workspace?.gmail_connected 
                                ? `Syncing sales emails at ${workspace.business_email}` 
                                : "Awaiting Google Authentication"}
                            </div>
                          </div>
                        </div>
                        
                        {workspace?.gmail_connected ? (
                          <button 
                            onClick={handleDisconnectGmail}
                            className="bg-white/5 hover:bg-[#ff5f57]/10 text-white/80 hover:text-[#ff5f57] border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Disconnect Inbox
                          </button>
                        ) : (
                          <button 
                            onClick={handleConnectGmail}
                            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-md shadow-blue-500/10"
                          >
                            Connect Gmail Inbox
                          </button>
                        )}
                      </Card>

                      {/* WhatsApp Baileys Integration status */}
                      <Card className="p-5 border-white/10 bg-white/[0.01] flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded bg-white/5 flex items-center justify-center ${waConnected ? 'text-[#28c840]' : 'text-white/30'}`}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.58 1.972 14.106.945 11.99.945c-5.442 0-9.866 4.372-9.87 9.802 0 1.92.512 3.792 1.48 5.467l-.985 3.6 3.69-.97-.248.146zm11.967-7.661c-.32-.16-1.89-.93-2.185-1.04-.294-.11-.51-.16-.723.16-.21.32-.82.104-1.004.32-.185.22-.37.24-.69.08-.314-.16-1.33-.49-2.53-1.56-.94-.84-1.57-1.87-1.75-2.19-.19-.32-.02-.49.14-.65.15-.14.32-.37.49-.56.17-.18.22-.31.34-.52.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.39-.26-.64-.53-.55-.72-.56-.19-.01-.41-.01-.63-.01-.22 0-.58.08-.88.4-.3.32-1.15 1.12-1.15 2.73 0 1.61 1.17 3.16 1.33 3.38.16.22 2.3 3.52 5.58 4.94.78.34 1.39.54 1.86.69.78.25 1.49.21 2.06.13.63-.09 1.89-.77 2.15-1.48.27-.71.27-1.32.19-1.45-.08-.12-.3-.21-.62-.37z"/>
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-white font-semibold">WhatsApp Automation Gateway</div>
                              <div className="text-[10px] text-white/40 mt-0.5">
                                {waConnected 
                                  ? `Connected as ${waPhone || 'Active Client'}` 
                                  : "Local WhatsApp sidecar service must be running on port 3000"}
                              </div>
                            </div>
                          </div>
                          
                          {waConnected && (
                            <span className="text-[10px] text-[#28c840] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Connected
                            </span>
                          )}
                        </div>

                        {!waConnected && (
                          <div className="border-t border-white/5 pt-4 mt-2">
                            {waQr ? (
                              <div className="flex flex-col items-center gap-3 py-4">
                                <div className="bg-white p-3 rounded-2xl w-48 h-48 flex items-center justify-center border border-white/10 shadow-lg">
                                  <img src={waQr} alt="WhatsApp QR Code" className="w-full h-full" />
                                </div>
                                <span className="text-[10px] text-white/50 text-center max-w-[280px]">
                                  Scan this QR code using your WhatsApp app (Linked Devices) to link your automated sales assistant.
                                </span>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-[10px] text-white/30 italic">
                                Awaiting connection to local WhatsApp service... Ensure 'npm start' is running in the 'whatsapp-service/' folder.
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                )}

                {activeTab === 'Billing' && (
                  <div>
                    <h2 className="text-lg font-medium text-white mb-6">Billing & Subscription</h2>
                    <div className="flex flex-col gap-4 text-xs text-white/80">
                      <div className="border border-[#28c840]/20 bg-[#28c840]/[0.02] p-5 rounded-2xl flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold text-white mb-1">Hackarena Enterprise Tier</div>
                          <p className="text-[10px] text-white/40">Includes unlimited AI email workflows and 20s background polling.</p>
                        </div>
                        <Badge variant="success">Active Subscription</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Reset Workspace"
        message="Are you sure you want to reset your workspace profile? This deletes all catalog files, connection properties, and clears your browser session."
        confirmText="Reset Profile"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeReset}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </PageTransition>
  );
}
