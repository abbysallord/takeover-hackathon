import { useState, useEffect } from 'react';
import { Grid, CheckCircle2, RotateCw, Sparkles, Zap, Mail, HelpCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { mockApi } from '../services/mockApi';

export function DashboardOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('Acme Electronics');
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(true);
  const [lastSyncedText, setLastSyncedText] = useState('Checking...');
  const [isSyncing, setIsSyncing] = useState(false);

  const [workspace, setWorkspace] = useState<any>(null);
  const [selectedTourStep, setSelectedTourStep] = useState<number | null>(null);

  useEffect(() => {
    mockApi.getWorkspace().then(w => {
      if (w) {
        setWorkspace(w);
        setCompanyName(w.company_name);
      }
    });
    
    const fetchData = () => {
      Promise.all([
        mockApi.getStats().then(setStats),
        mockApi.getWorkflows().then(setWorkflows)
      ]).catch(e => console.error("Error refreshing dashboard:", e));
    };

    fetchData();
    setIsLoading(true);
    // Initial fetch triggers loading state, subsequent polls update in background
    Promise.all([
      mockApi.getStats().then(setStats),
      mockApi.getWorkflows().then(setWorkflows)
    ]).then(() => setIsLoading(false));

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let syncInterval: any;
    
    const refreshSyncTime = async () => {
      const res = await mockApi.getSyncStatus();
      if (res && res.last_synced_at) {
        const diff = Math.floor((Date.now() - new Date(res.last_synced_at).getTime()) / 1000);
        if (diff < 5) setLastSyncedText('Just now');
        else if (diff < 60) setLastSyncedText(`${diff}s ago`);
        else setLastSyncedText(`${Math.floor(diff / 60)}m ago`);
      } else {
        setLastSyncedText('Never');
      }
    };

    refreshSyncTime();
    syncInterval = setInterval(refreshSyncTime, 5000);
    return () => clearInterval(syncInterval);
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await mockApi.triggerSync();
      // Immediately refresh stats & workflows
      const [s, w, wk] = await Promise.all([
        mockApi.getStats(),
        mockApi.getWorkflows(),
        mockApi.getWorkspace()
      ]);
      setStats(s);
      setWorkflows(w);
      if (wk) setWorkspace(wk);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const step1Completed = !!workspace?.catalog_data;
  const step2Completed = !!workspace?.gmail_connected;
  const step3Completed = (stats?.emailsReceived || 0) > 0;
  const step4Completed = (stats?.quotesGenerated || 0) > 0 || (stats?.pendingApprovals || 0) > 0;

  const getActiveStep = () => {
    if (!step1Completed) return 1;
    if (!step2Completed) return 2;
    if (!step3Completed) return 3;
    return 4;
  };
  const activeStep = getActiveStep();
  const currentDisplayStep = selectedTourStep !== null ? selectedTourStep : activeStep;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6] flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">{companyName}</h2>
              <p className="text-xs text-white/45 mt-0.5">AI Sales Operations Workspace</p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            {/* Real-time Gmail Sync Status & Trigger */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.02] ring-1 ring-white/5 text-[11px] backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-400 animate-ping' : 'bg-[#28c840]'}`} />
                <span className="text-white/40 uppercase font-semibold tracking-wider">Gmail Inbox:</span>
              </div>
              <span className="text-white/75 font-mono">{isSyncing ? 'Syncing...' : lastSyncedText}</span>
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Sync Gmail Now"
                className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-all ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
            <button 
              onClick={async () => {
                setIsLoading(true);
                await mockApi.runDemoMode();
                // Refresh statistics and pipeline
                Promise.all([
                  mockApi.getStats().then(setStats),
                  mockApi.getWorkflows().then(setWorkflows)
                ]).then(() => setIsLoading(false));
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-[#28c840] hover:opacity-95 px-4 py-2 rounded-lg transition-all text-white text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Run Demo Mode
            </button>
            <button 
              onClick={async () => {
                setIsLoading(true);
                await mockApi.simulateWorkflow();
                // Refresh statistics and pipeline
                Promise.all([
                  mockApi.getStats().then(setStats),
                  mockApi.getWorkflows().then(setWorkflows)
                ]).then(() => setIsLoading(false));
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg transition-colors text-white text-xs font-medium border border-white/5"
            >
              <Mail className="w-4 h-4" />
              Simulate New Email
            </button>
          </div>
        </div>

        {/* Interactive Workspace Setup Progress Stepper */}
        <div className="mb-8 rounded-2xl bg-white/[0.02] ring-1 ring-white/10 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTour(!showTour)}>
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide">Interactive Guided Setup</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Learn how to test and run the autonomous sales pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Overall Progress Indicator */}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-mono">
                {([step1Completed, step2Completed, step3Completed, step4Completed].filter(Boolean).length)} / 4 Steps
              </span>
              {showTour ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
            </div>
          </div>
          
          {showTour && (
            <div className="mt-6 border-t border-white/5 pt-6">
              {/* Stepper Header Timeline */}
              <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto px-4">
                {[
                  { id: 1, label: "Catalog", done: step1Completed },
                  { id: 2, label: "Gmail Link", done: step2Completed },
                  { id: 3, label: "Inquiry", done: step3Completed },
                  { id: 4, label: "Pipeline", done: step4Completed }
                ].map((step, idx) => (
                  <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                    {/* Circle Node */}
                    <button 
                      onClick={() => setSelectedTourStep(step.id)}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ring-4 ${
                        currentDisplayStep === step.id 
                          ? 'ring-blue-500/20 bg-blue-500 text-white' 
                          : step.done 
                            ? 'ring-emerald-500/10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'ring-transparent bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {step.done ? "✓" : step.id}
                      
                      {/* Floating Step Title */}
                      <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium tracking-wide uppercase ${
                        currentDisplayStep === step.id ? 'text-blue-400 font-bold' : step.done ? 'text-emerald-400' : 'text-white/30'
                      }`}>
                        {step.label}
                      </span>
                    </button>

                    {/* Progress Connecting Line */}
                    {idx < 3 && (
                      <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all duration-500 ${
                        step.done ? 'bg-gradient-to-r from-emerald-500/50 to-emerald-500/10' : 'bg-white/5'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Context Display Cards */}
              <div className="mt-8 p-4 rounded-xl bg-white/[0.01] ring-1 ring-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider font-mono">Step {currentDisplayStep} of 4</span>
                    
                    {/* Dynamic Status Badges */}
                    {currentDisplayStep === 1 && (
                      step1Completed 
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">✅ Active (Catalog Ready)</span>
                        : <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 animate-pulse">⚡ Action Required</span>
                    )}
                    {currentDisplayStep === 2 && (
                      step2Completed 
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">✅ Gmail Connected</span>
                        : (step1Completed 
                            ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 animate-pulse">⚡ Next Action</span>
                            : <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">⏳ Locked</span>)
                    )}
                    {currentDisplayStep === 3 && (
                      step3Completed 
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">✅ Email Logged</span>
                        : (step2Completed 
                            ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 animate-pulse">⚡ Next Action</span>
                            : <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">⏳ Locked</span>)
                    )}
                    {currentDisplayStep === 4 && (
                      step4Completed 
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">✅ Quote Processed</span>
                        : (step3Completed 
                            ? <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 animate-pulse">⚡ Next Action</span>
                            : <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">⏳ Locked</span>)
                    )}
                  </div>
                  
                  {/* Step Description copy-paste contents */}
                  {currentDisplayStep === 1 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1.5">Configure Product Inventory & Pricing Rules</h4>
                      <p className="text-white/50 text-[11px] leading-relaxed max-w-2xl">
                        To enable the sales operations agent to classify catalog requests, run pricing computations, and gate out-of-stock items, upload catalog files. You can configure this under the <strong>Settings</strong> tab in the sidebar.
                      </p>
                    </div>
                  )}
                  {currentDisplayStep === 2 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1.5">Connect Sales Gmail Inbox</h4>
                      <p className="text-white/50 text-[11px] leading-relaxed max-w-2xl">
                        Authorize the background sales agent to read and reply to emails automatically. Head to the <strong>Settings</strong> integrations panel, input your Google credentials, and click **Connect Gmail** to authorize.
                      </p>
                    </div>
                  )}
                  {currentDisplayStep === 3 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1.5">Send a Test Sales Inquiry Email</h4>
                      <p className="text-white/50 text-[11px] leading-relaxed max-w-2xl">
                        Send an email from your personal account to the connected business inbox. Try asking for prices (e.g., <em>"How much is 1 unit of Widget A?"</em>) or request a purchase (e.g., <em>"Please send me 20 units of Widget B."</em>).
                      </p>
                    </div>
                  )}
                  {currentDisplayStep === 4 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1.5">Evaluate Orchestration and Approvals</h4>
                      <p className="text-white/50 text-[11px] leading-relaxed max-w-2xl">
                        The background worker runs the lead through catalog RAG checks. Quotes under $3,000 are sent instantly. Quotes over $3,000 require manager validation: check the **Approvals** screen in the sidebar to review and release the quote!
                      </p>
                    </div>
                  )}
                </div>

                {/* Walkthrough CTA buttons */}
                <div className="flex md:flex-col justify-end items-end gap-2.5 min-w-[120px]">
                  {currentDisplayStep === 1 && (
                    <button 
                      onClick={() => navigate('/dashboard/settings')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white text-[11px] font-medium"
                    >
                      Go to Settings
                    </button>
                  )}
                  {currentDisplayStep === 2 && (
                    <button 
                      onClick={() => navigate('/dashboard/settings')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white text-[11px] font-medium"
                    >
                      Configure Inbox
                    </button>
                  )}
                  {currentDisplayStep === 3 && (
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        await mockApi.simulateWorkflow();
                        Promise.all([
                          mockApi.getStats().then(setStats),
                          mockApi.getWorkflows().then(setWorkflows)
                        ]).then(() => setIsLoading(false));
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/5 text-white text-[11px] font-medium transition-colors"
                    >
                      Simulate Email
                    </button>
                  )}
                  {currentDisplayStep === 4 && (
                    <button 
                      onClick={() => navigate('/dashboard/approvals')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white text-[11px] font-medium"
                    >
                      View Approvals
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'EMAILS RECEIVED', value: stats?.emailsReceived },
            { label: 'ACTIVE WORKFLOWS', value: stats?.activeWorkflows },
            { label: 'PENDING APPROVALS', value: stats?.pendingApprovals },
            { label: 'COMPLETED WORKFLOWS', value: stats?.completedWorkflows },
            { label: 'QUOTES GENERATED', value: stats?.quotesGenerated },
            { label: 'REVENUE PIPELINE', value: stats?.revenuePipeline },
            { label: 'AVG RESPONSE TIME', value: stats?.avgResponseTime },
            { label: 'EST. TIME SAVED', value: stats?.timeSaved },
            { label: 'AI CONFIDENCE', value: stats?.aiConfidence }
          ].map((stat, i) => (
            <div key={i} className="px-5 py-4 flex flex-col justify-center rounded-2xl bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-[9px] tracking-wider text-white/35 font-semibold mb-1">{stat.label}</div>
              {isLoading ? (
                <div className="h-6 w-20 bg-white/10 rounded animate-pulse mt-1" />
              ) : (
                <div className="text-lg font-medium text-white mt-0.5">{stat.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {['Hardware Sales', 'Software Licensing', 'Enterprise Solutions'].map((cat, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-5 flex flex-col gap-3 relative overflow-hidden group cursor-pointer hover:bg-white/[0.05] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2">
                <Grid className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-sm text-white font-medium">{cat}</span>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Workflow Table */}
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Active Workflow Pipeline</span>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Process Step</th>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Description</th>
                  <th className="px-4 py-3 text-[10px] font-medium text-white/35 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton Rows
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={`skel-${i}`}>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-32 bg-white/5 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-64 bg-white/5 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5 border-b border-white/5"><div className="h-4 w-20 bg-white/5 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : (
                  workflows.map((row) => (
                    <>
                      <tr 
                        key={row.id} 
                        onClick={() => setExpandedStepId(expandedStepId === row.id ? null : row.id)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3.5 text-xs text-white/80 border-b border-white/5 group-last:border-0">{row.step}</td>
                        <td className="px-4 py-3.5 text-[11px] text-white/50 border-b border-white/5 group-last:border-0">{row.desc}</td>
                        <td className={`px-4 py-3.5 text-[11px] font-medium border-b border-white/5 group-last:border-0 flex items-center gap-2 ${row.color}`}>
                          {row.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : (row.status === 'Processing' ? <RotateCw className="w-4 h-4 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20 ml-1" />)}
                          {row.status}
                        </td>
                      </tr>
                      {expandedStepId === row.id && (
                        <tr key={`expand-${row.id}`}>
                          <td colSpan={3} className="px-6 py-4 bg-white/[0.01] border-b border-white/5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                              <div>
                                <span className="text-[10px] text-white/30 uppercase block font-semibold">Tool Activated</span>
                                <span className="text-white/80 font-mono mt-1 block bg-white/5 px-2 py-1 rounded w-fit">{row.tool}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-white/30 uppercase block font-semibold">Execution Time</span>
                                <span className="text-white/80 mt-1 block">{row.duration}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-white/30 uppercase block font-semibold">AI Confidence</span>
                                <span className="text-white/80 mt-1 block">{row.confidence}</span>
                              </div>
                              <div className="col-span-2 md:col-span-4 mt-2">
                                <span className="text-[10px] text-white/30 uppercase block font-semibold">Agent Reasoning & Context</span>
                                <p className="text-white/70 mt-1 text-[11px] leading-relaxed italic">"{row.reasoning}"</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
                {!isLoading && workflows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-white/40">No active workflows found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
