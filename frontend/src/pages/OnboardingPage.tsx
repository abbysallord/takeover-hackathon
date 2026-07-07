import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Database, FileText, CheckCircle2, ArrowRight, ArrowLeft, Building2, RotateCw } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/ui/ToastContext';
import { mockApi } from '../services/mockApi';
import { Dialog } from '../components/ui/Dialog';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [enteredSessionId, setEnteredSessionId] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');

  useEffect(() => {
    setCurrentSessionId(localStorage.getItem('flow_session_id') || '');
  }, []);
  
  // Load initial values from localStorage to survive OAuth redirect reload
  const [step, setStep] = useState(() => {
    const s = localStorage.getItem('onb_step');
    return s ? parseInt(s) : 1;
  });
  const [loading, setLoading] = useState(false);

  const [companyName, setCompanyName] = useState(() => localStorage.getItem('onb_companyName') || '');
  const [businessEmail, setBusinessEmail] = useState(() => localStorage.getItem('onb_businessEmail') || 'pending@connect.com');
  const [industry, setIndustry] = useState(() => localStorage.getItem('onb_industry') || 'Technology');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [catalogData, setCatalogData] = useState(() => localStorage.getItem('onb_catalogData') || '');
  const [pricingData, setPricingData] = useState(() => localStorage.getItem('onb_pricingData') || '');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('onb_googleClientId') || '');
  const [googleClientSecret, setGoogleClientSecret] = useState(() => localStorage.getItem('onb_googleClientSecret') || '');
  const [googleRedirectUri, setGoogleRedirectUri] = useState(() => localStorage.getItem('onb_googleRedirectUri') || 'http://localhost:8001/workspace/oauth-callback');

  // Handle URL redirect query parameters and load credential defaults on mount
  useEffect(() => {
    // If onboarding is already completed in DB, redirect to dashboard immediately
    mockApi.getWorkspace().then(workspace => {
      if (workspace && workspace.onboarding_completed) {
        navigate('/dashboard');
      }
    });

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('gmail_connected');
    const err = params.get('error');

    if (connected === 'true') {
      setGmailConnected(true);
      setStep(2); // Retain on Google step but show connected
      toast('Gmail connected successfully via Google OAuth!', 'success');
      
      // Load real connected email address from backend workspace profile
      mockApi.getWorkspace().then(workspace => {
        if (workspace && workspace.business_email) {
          setBusinessEmail(workspace.business_email);
          localStorage.setItem('onb_businessEmail', workspace.business_email);
        }
      });

      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (err) {
      toast(`OAuth connection failed: ${err}`, 'error');
      setStep(2);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Fetch credential defaults from backend configuration securely
    const fetchDefaults = async () => {
      try {
        const defaults = await mockApi.getCredentialsDefaults();
        if (!localStorage.getItem('onb_googleClientId') && defaults.client_id) {
          setGoogleClientId(defaults.client_id);
        }
        if (!localStorage.getItem('onb_googleClientSecret') && defaults.client_secret) {
          setGoogleClientSecret(defaults.client_secret);
        }
        if ((!localStorage.getItem('onb_googleRedirectUri') || localStorage.getItem('onb_googleRedirectUri')?.includes('localhost')) && defaults.redirect_uri) {
          setGoogleRedirectUri(defaults.redirect_uri);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDefaults();
  }, []);

  // Sync state variables to localStorage
  useEffect(() => {
    localStorage.setItem('onb_step', String(step));
  }, [step]);
  useEffect(() => {
    localStorage.setItem('onb_companyName', companyName);
  }, [companyName]);
  useEffect(() => {
    localStorage.setItem('onb_businessEmail', businessEmail);
  }, [businessEmail]);
  useEffect(() => {
    localStorage.setItem('onb_industry', industry);
  }, [industry]);
  useEffect(() => {
    localStorage.setItem('onb_catalogData', catalogData);
  }, [catalogData]);
  useEffect(() => {
    localStorage.setItem('onb_pricingData', pricingData);
  }, [pricingData]);
  useEffect(() => {
    localStorage.setItem('onb_googleClientId', googleClientId);
  }, [googleClientId]);
  useEffect(() => {
    localStorage.setItem('onb_googleClientSecret', googleClientSecret);
  }, [googleClientSecret]);
  useEffect(() => {
    localStorage.setItem('onb_googleRedirectUri', googleRedirectUri);
  }, [googleRedirectUri]);

  const clearOnboardingCache = () => {
    localStorage.removeItem('onb_step');
    localStorage.removeItem('onb_companyName');
    localStorage.removeItem('onb_businessEmail');
    localStorage.removeItem('onb_industry');
    localStorage.removeItem('onb_catalogData');
    localStorage.removeItem('onb_pricingData');
    localStorage.removeItem('onb_googleClientId');
    localStorage.removeItem('onb_googleClientSecret');
    localStorage.removeItem('onb_googleRedirectUri');
  };

  const handleConnectGmail = async () => {
    try {
      setLoading(true);
      const payload = {
        company_name: companyName,
        business_email: businessEmail,
        industry: industry,
        gmail_connected: false,
        catalog_data: catalogData || '',
        pricing_data: pricingData || '',
        google_client_id: googleClientId,
        google_client_secret: googleClientSecret,
        google_redirect_uri: googleRedirectUri
      };
      
      const saved = await mockApi.setupWorkspace(payload);
      if (!saved) {
        toast('Failed to save credentials before authentication.', 'error');
        setLoading(false);
        return;
      }

      const res = await mockApi.getGoogleAuthUrl();
      if (res && res.auth_url) {
        toast('Redirecting to Google OAuth...', 'success');
        window.location.href = res.auth_url;
      } else {
        toast('Failed to generate Google auth URL.', 'error');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      toast('OAuth routing failed.', 'error');
      setLoading(false);
    }
  };

  const loadAcmeCatalog = () => {
    setCatalogData(`# Company Product Catalog

## 1. Widget A
*   **SKU**: WD-A-01
*   **Description**: High-durability standard hardware widget designed for electronics.
*   **Availability**: In Stock

## 2. Widget B
*   **SKU**: WD-B-02
*   **Description**: Advanced electronic widget with micro-relays. Used in robotics.
*   **Availability**: In Stock

## 3. Widget C
*   **SKU**: WD-C-03
*   **Description**: Premium industrial grade widget featuring titanium coating.
*   **Availability**: Low Stock

## 4. Server Rack
*   **SKU**: SR-RK-99
*   **Description**: 42U industrial network server rack cabinet with smart PDU.
*   **Availability**: 2 days assembly
`);
    toast('Loaded Acme Product Catalog Template!', 'success');
  };

  const loadAcmePricing = () => {
    setPricingData(`# Sales Pricing & Policies

## 1. Pricing Guidelines
*   Widget A: $10.00 base unit price.
*   Widget B: $45.00 base unit price.
*   Widget C: $120.00 base unit price.
*   Server Rack: $850.00 base unit price.

## 2. Discount Tiers
*   Widget A & B: 10% discount for orders >= 100 units. 20% discount for >= 500 units.
*   Widget C: 5% discount for orders >= 50 units. No discounts under 50 units.
*   Server Rack: Flat pricing.

## 3. Human Approval Gate
*   Quotations with a grand total value exceeding $3,000.00 USD must be held and sent to the manager for manual approval before the email reply is dispatched.
`);
    toast('Loaded Acme Pricing & Policies Template!', 'success');
  };

  const handleNext = () => {
    if (step === 1 && !companyName) {
      toast('Please enter your company name to continue.', 'error');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      const payload = {
        company_name: companyName,
        business_email: businessEmail,
        industry: industry,
        gmail_connected: gmailConnected,
        catalog_data: catalogData,
        pricing_data: pricingData,
        google_client_id: googleClientId,
        google_client_secret: googleClientSecret,
        google_redirect_uri: googleRedirectUri,
        onboarding_completed: true
      };
      
      const res = await mockApi.setupWorkspace(payload);
      if (res) {
        clearOnboardingCache();
        toast('Workspace initialized successfully!', 'success');
        navigate('/dashboard');
      } else {
        toast('Failed to save workspace configurations.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Workspace setup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleResumeSession = async () => {
    if (!enteredSessionId || !enteredSessionId.trim()) {
      toast('Please enter a Workspace Session Key.', 'error');
      return;
    }

    const cleanKey = enteredSessionId.trim();
    const originalSessionId = localStorage.getItem('flow_session_id');

    try {
      setLoading(true);
      // Temporarily swap session ID to test existence
      localStorage.setItem('flow_session_id', cleanKey);
      
      const workspace = await mockApi.getWorkspace();
      
      if (workspace) {
        clearOnboardingCache();
        toast('Workspace Session restored successfully!', 'success');
        setIsResumeOpen(false);
        
        if (workspace.onboarding_completed) {
          navigate('/dashboard');
        } else {
          setCompanyName(workspace.company_name || '');
          setBusinessEmail(workspace.business_email || '');
          setIndustry(workspace.industry || 'Technology');
          setGmailConnected(workspace.gmail_connected || false);
          setCatalogData(workspace.catalog_data || '');
          setPricingData(workspace.pricing_data || '');
          setStep(1);
          window.location.reload();
        }
      } else {
        throw new Error('Workspace not found');
      }
    } catch (e) {
      if (originalSessionId) {
        localStorage.setItem('flow_session_id', originalSessionId);
      } else {
        localStorage.removeItem('flow_session_id');
      }
      toast('Workspace Session Key not found. Please verify the key and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="relative min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
        {/* Glowing Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#28c840]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-xl bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-2xl">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Setup Workspace</span>
            </div>
            <div className="text-xs text-white/40">Step {step} of 5</div>
          </div>

          <div className="h-1.5 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-[#28c840] transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          {/* Step 1: Welcome & Profile */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-2">Welcome to AI Sales Operations</h2>
              <p className="text-xs text-white/50 mb-8 leading-relaxed">Let's initialize your workspace to calibrate your autonomous sales agent.</p>
              
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Company Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                    <input 
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      maxLength={80}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-white/40 block mb-2 tracking-wider">Industry</label>
                  <select 
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
                  >
                    <option value="Technology">Technology & Software</option>
                    <option value="Manufacturing">Manufacturing & Hardware</option>
                    <option value="Retail">Retail & E-commerce</option>
                    <option value="Services">Professional Services</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Gmail Connect */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-2">Connect Your Email</h2>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">Connect your business inbox so the AI Operations Manager can automatically check for incoming enquiries.</p>
              
              <div className="flex flex-col gap-5 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col items-center justify-center text-center gap-2 mb-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Gmail API Integration</h3>
                    <p className="text-[10px] text-white/40 max-w-xs leading-relaxed mt-1">Connect your Gmail to let the agent auto-read inquiries and reply once approved.</p>
                  </div>
                </div>



                <div className="flex justify-center">
                  {gmailConnected ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="flex items-center gap-2 text-xs text-[#28c840] font-medium bg-[#28c840]/10 border border-[#28c840]/25 px-4 py-2 rounded-xl w-full justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected to: {businessEmail || "Gmail Account"}</span>
                      </div>
                      <button 
                        onClick={() => setGmailConnected(false)}
                        className="text-[10px] text-white/40 hover:text-white/60 underline"
                      >
                        Disconnect & Reset connection
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleConnectGmail}
                      disabled={loading}
                      className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Routing to Google...</span>
                        </>
                      ) : (
                        <span>Connect Gmail Inbox</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Product Catalogue */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-2">Product Catalog</h2>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">Define the products you sell. This catalogue will be referenced by the RAG search when customers ask about availability.</p>
              
              <button 
                onClick={loadAcmeCatalog}
                className="mb-4 text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                Load Acme Electronic Template
              </button>

              <textarea 
                rows={8}
                placeholder="# Products Catalogue&#10;Write product details here in Markdown format..."
                value={catalogData}
                onChange={e => setCatalogData(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-white/20 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Step 4: Pricing Policies */}
          {step === 4 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-2">Pricing & Policies</h2>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">Define standard pricing, shipping, discount volume brackets, and manager approval policies to guide automated quotation writing.</p>
              
              <button 
                onClick={loadAcmePricing}
                className="mb-4 text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Load Acme Pricing & Discount Template
              </button>

              <textarea 
                rows={8}
                placeholder="# Pricing Policies&#10;Define discount structures and manual approval thresholds..."
                value={pricingData}
                onChange={e => setPricingData(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-white/20 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Step 5: Finish */}
          {step === 5 && (
            <div className="animate-fade-up text-center flex flex-col items-center justify-center gap-6 py-6">
              <div className="w-16 h-16 rounded-full bg-[#28c840]/10 flex items-center justify-center text-[#28c840]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
                <p className="text-xs text-white/50 max-w-sm leading-relaxed mx-auto">Your AI Sales Operations Workspace is ready. The AI Manager is primed to parse emails and compile quotes dynamically using your custom rules.</p>
              </div>

              <div className="w-full border border-white/5 bg-white/[0.01] rounded-2xl p-4 text-left text-xs text-white/60">
                <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                  <span>Workspace</span>
                  <span className="font-semibold text-white">{companyName}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                  <span>Email Sync</span>
                  <span className="font-semibold text-white">{gmailConnected ? 'Connected (Sandbox)' : 'Disconnected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>RAG Knowledge base</span>
                  <span className="text-[#28c840] font-semibold">Indexed</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/5">
            {step > 1 ? (
              <button 
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-transparent hover:bg-white/5 text-xs text-white font-semibold transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-semibold transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-[#28c840] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Initializing RAG...' : 'Launch Workspace'}
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sleek Resume Session Card */}
        <div className="w-full max-w-xl mt-6 bg-white/[0.01] border border-white/5 rounded-3xl p-6 backdrop-blur-md text-center text-xs text-white/50 relative overflow-hidden">
          <span>Already have a workspace session? </span>
          <button 
            onClick={() => setIsResumeOpen(true)}
            className="text-blue-400 hover:text-blue-300 font-semibold underline ml-1"
          >
            Click here to resume
          </button>
          
          <div className="mt-4 text-[10px] text-white/20 border-t border-white/5 pt-4 flex justify-between items-center px-2">
            <span>Your Current Workspace Key: <span className="font-mono text-white/40 select-all">{currentSessionId}</span></span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(currentSessionId);
                toast('Workspace Key copied to clipboard!', 'success');
              }}
              className="text-blue-500 hover:underline hover:text-blue-400"
            >
              Copy Key
            </button>
          </div>
        </div>

        {/* Dialog to input Session ID */}
        <Dialog
          isOpen={isResumeOpen}
          onClose={() => setIsResumeOpen(false)}
          title="Resume Workspace Session"
          onConfirm={handleResumeSession}
          confirmText="Restore Session"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/60 leading-relaxed">
              Paste your unique Workspace Session Key below to restore your configurations, catalog data, and transaction logs.
            </p>
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Workspace Session Key</label>
              <input 
                type="text" 
                placeholder="e.g. session_abc123"
                value={enteredSessionId}
                onChange={e => setEnteredSessionId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-white/20 outline-none focus:ring-1 focus:ring-white/20" 
              />
            </div>
          </div>
        </Dialog>
      </div>
    </PageTransition>
  );
}
