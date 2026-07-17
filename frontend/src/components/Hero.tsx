import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowUp, ArrowRight, Mail, Search, FileText, CheckCircle2, 
  Send, Database, Zap, Sparkles, ShieldCheck, Check, HelpCircle, 
  DollarSign, Clock, Layers, Users, ChevronDown, ChevronUp, Lock,
  MessageSquare
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Navbar } from './Navbar';
import { ScaledDashboard } from './ScaledDashboard';
import { DashboardMockup } from './DashboardMockup';
import { PageTransition } from './PageTransition';

export function Hero() {
  const navigate = useNavigate();
  
  // Scroll Animation Transforms for Dashboard Peek Mockup
  const { scrollYProgress } = useScroll();
  const dashboardScale = useTransform(scrollYProgress, [0, 0.25], [0.93, 1.03]);
  const dashboardRotateX = useTransform(scrollYProgress, [0, 0.25], [10, 0]);
  const dashboardTranslateY = useTransform(scrollYProgress, [0, 0.25], [40, 0]);
  
  // Interactive Email Query
  const [query, setQuery] = useState('');
  
  // ROI Calculator State
  const [dailyEmails, setDailyEmails] = useState(50);
  const [avgHandlingTime, setAvgHandlingTime] = useState(15); // minutes per email
  
  // Playground Simulator States
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [simStep, setSimStep] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [simApproved, setSimApproved] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/dashboard/inbox?demo=true&q=${encodeURIComponent(query.trim())}`);
    }
  };

  const emailPresets = [
    {
      id: 'stark',
      title: 'Stark Industries',
      subject: 'Bulk Request: Widget-B',
      body: 'Hi team, Stark Industries needs to purchase 120 units of Widget B. Can you check availability, calculate bulk pricing, and send a quotation for approval? Thanks, Tony.',
      steps: [
        { label: 'Reading Email & Intent', desc: 'Extracted order: 120x Widget B from Stark Industries.', status: 'success' },
        { label: 'RAG Knowledge Lookup', desc: 'Retrieved "Standard Pricing V2" - Widget B is $100/unit. Bulk (>100) discount is 10%.', status: 'success' },
        { label: 'Inventory Verification', desc: 'Mock warehouse API: 350 units in stock. Status: Available.', status: 'success' },
        { label: 'Generating Quotation Draft', desc: 'Created Quote Q-8710: Total $10,800 ($1,200 discount applied). Draft email created.', status: 'success' },
        { label: 'Human-in-the-Loop Approval', desc: 'Awaiting manager sign-off before sending.', status: 'pending' }
      ]
    },
    {
      id: 'wayne',
      title: 'Wayne Enterprises',
      subject: 'Custom Quote: Shield-X',
      body: 'Hello, we require 45 units of Shield-X for a special pilot project. Do you have stock, and what are the shipping terms? Best, Bruce.',
      steps: [
        { label: 'Reading Email & Intent', desc: 'Extracted request: 45x Shield-X from Wayne Enterprises.', status: 'success' },
        { label: 'RAG Knowledge Lookup', desc: 'Retrieved "Special Systems catalog". Shield-X is $450/unit. No bulk discounts apply.', status: 'success' },
        { label: 'Inventory Verification', desc: 'Mock warehouse API: Only 12 units available in stock. 33 units backordered.', status: 'success' },
        { label: 'Generating Quotation Draft', desc: 'Created backorder quotation Q-8711: Total $20,250. Draft email noting 2-week backorder delay.', status: 'success' },
        { label: 'Human-in-the-Loop Approval', desc: 'Awaiting manager sign-off before sending.', status: 'pending' }
      ]
    }
  ];

  // Simulator Engine
  useEffect(() => {
    if (!simRunning || activePreset === null) return;
    
    const preset = emailPresets.find(p => p.id === activePreset);
    if (!preset) return;

    if (simStep < preset.steps.length - 1) {
      const timer = setTimeout(() => {
        setSimStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setSimRunning(false);
    }
  }, [simRunning, simStep, activePreset]);

  const startPresetSimulation = (presetId: string) => {
    setActivePreset(presetId);
    setSimStep(0);
    setSimRunning(true);
    setSimApproved(false);
  };

  const approveSimQuote = () => {
    setSimApproved(true);
  };

  // Calculations for ROI
  const monthlyEmails = dailyEmails * 22; // 22 working days
  const timeSavedHrs = Math.round((monthlyEmails * avgHandlingTime) / 60);
  const moneySaved = Math.round(timeSavedHrs * 35); // Estimated $35/hr salary rate

  return (
    <PageTransition>
      <div className="bg-[#0c0c0e] text-white min-h-screen flex flex-col relative overflow-hidden font-sans">
        
        {/* Glowing Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#28c840]/5 blur-[150px] pointer-events-none" />

        <Navbar />

        {/* HERO SECTION */}
        <section className="relative z-10 max-w-7xl mx-auto px-5 pt-16 lg:pt-24 pb-16 flex flex-col items-center text-center">
          
          {/* Eyebrow */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] ring-1 ring-white/10 text-white/70 text-xs font-mono tracking-wide mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Autonomous Sales Operations Agent</span>
          </div>

          {/* Headline */}
          <h1 className="text-gray-100 font-normal leading-[1.05] tracking-tight flex flex-col">
            <span className="text-[40px] min-[400px]:text-[48px] sm:text-6xl lg:text-7xl xl:text-[80px] animate-fade-up">
              Automate Sales Ops.
            </span>
            <span className="text-[40px] min-[400px]:text-[48px] sm:text-6xl lg:text-7xl xl:text-[80px] animate-fade-up [animation-delay:100ms] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-green-500">
              End-to-End.
            </span>
          </h1>

          {/* Subtext */}
          <p className="animate-fade-up [animation-delay:220ms] mt-6 text-white/50 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl">
            Flow autonomously ingests inbound client emails, checks inventory, queries catalog policies via RAG, generates quote PDFs, and updates your CRM. Safe, human-in-the-loop validation built-in.
          </p>

          {/* Live Simulation Form */}
          <div className="animate-fade-up [animation-delay:340ms] mt-8 w-full max-w-xl">
            <form className="flex items-center gap-3 rounded-full bg-white/[0.03] ring-1 ring-white/10 backdrop-blur-md pl-5 pr-1.5 py-1.5 focus-within:ring-white/20 transition-all" onSubmit={handleDemoSubmit}>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your enquiry, e.g. Stark Industries needs 120 Widget B..." 
                className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-white/30 outline-none py-2"
              />
              <button 
                type="submit" 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shrink-0"
              >
                <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            </form>
          </div>

          {/* Quick CTAs */}
          <div className="animate-fade-up [animation-delay:460ms] mt-6 flex flex-wrap items-center justify-center gap-3.5">
            <Link to="/dashboard" className="bg-white text-black text-sm font-semibold px-6 py-3 rounded-full hover:bg-white/95 hover:shadow-lg hover:shadow-white/5 transition-all flex items-center gap-2">
              Launch Agent Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#playground" className="text-white/80 text-sm font-semibold px-6 py-3 rounded-full ring-1 ring-white/10 hover:bg-white/5 transition-colors">
              Try Sandbox Demo
            </a>
          </div>

          {/* App Preview Mockup */}
          <motion.div 
            style={{ 
              scale: dashboardScale, 
              rotateX: dashboardRotateX,
              y: dashboardTranslateY,
              transformStyle: 'preserve-3d',
              perspective: '1200px'
            }}
            className="relative z-0 w-full max-w-4xl mt-16 lg:mt-24"
          >
            <div className="absolute inset-0 bg-blue-500/10 rounded-t-2xl filter blur-3xl pointer-events-none -z-10" />
            <ScaledDashboard>
              <DashboardMockup />
            </ScaledDashboard>
          </motion.div>

        </section>

        {/* LOGO INTEGRATIONS WALL */}
        <section className="py-16 border-t border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto px-5 text-center">
            <p className="text-[10px] uppercase font-mono tracking-[0.2em] text-white/30 mb-8">Supported Sales Stack Sync</p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 opacity-70 hover:opacity-95 transition-opacity">
              <div className="flex items-center gap-2 text-white/70 font-mono text-xs bg-white/[0.02] ring-1 ring-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Mail className="w-4 h-4 text-red-400" />
                <span>Gmail Connection</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 font-mono text-xs bg-white/[0.02] ring-1 ring-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Salesforce Sync</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 font-mono text-xs bg-white/[0.02] ring-1 ring-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Layers className="w-4 h-4 text-orange-400" />
                <span>HubSpot Leads</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 font-mono text-xs bg-white/[0.02] ring-1 ring-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 font-mono text-xs bg-white/[0.02] ring-1 ring-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <MessageSquare className="w-4.5 h-4.5 text-purple-400" />
                <span>Slack Alerts</span>
              </div>
            </div>
          </div>
        </section>

        {/* FLOW PLAYGROUND SIMULATOR */}
        <section id="playground" className="py-24 border-t border-white/5 bg-[#0a0a0c]">
          <div className="max-w-5xl mx-auto px-5">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-blue-400 uppercase">Live Sandbox</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">Watch the AI Agent Think</h2>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">
                Click a preset scenario below to watch the autonomous sales agent orchestrate the entire workflow in real time, from email parsing to manager approval.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-6 items-start">
              
              {/* Presets Column (Left 2-cols) */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <span className="text-[10px] font-mono tracking-wider text-white/35 font-semibold">Select Email Enquiry:</span>
                {emailPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => startPresetSimulation(preset.id)}
                    className={`p-5 rounded-xl border text-left transition-all ${
                      activePreset === preset.id
                        ? 'bg-white/5 border-white/20 shadow-md ring-1 ring-white/10'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white/80">{preset.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40">Scenario</span>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-2">{preset.subject}</h4>
                    <p className="text-xs text-white/45 line-clamp-2 leading-relaxed">{preset.body}</p>
                  </button>
                ))}

                {/* Info block */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300/80 leading-relaxed">
                    <strong>Human-in-the-loop:</strong> Note how the workflow pauses on Step 5. No customer replies are dispatched without the sales manager's physical sign-off in the dashboard.
                  </p>
                </div>
              </div>

              {/* Simulation Screen (Right 3-cols) */}
              <div className="md:col-span-3 rounded-xl bg-[#131315] ring-1 ring-white/10 p-6 shadow-xl relative min-h-[420px] flex flex-col">
                
                {activePreset === null ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                    <Zap className="w-10 h-10 text-white/20 animate-pulse mb-4" />
                    <h4 className="text-sm font-semibold text-white/80">Select a scenario to start</h4>
                    <p className="text-xs text-white/40 mt-1 max-w-[280px] leading-relaxed">
                      Choose Tony Stark or Bruce Wayne's enquiry to launch the agent execution flow.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    
                    {/* Header bar */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Simulation: {emailPresets.find(p => p.id === activePreset)?.title}
                        </h4>
                        <p className="text-[10px] text-white/45 mt-0.5">Workflow Engine executing on thread</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {simRunning ? (
                          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                            <span>running</span>
                          </div>
                        ) : (
                          <div className="text-xs text-white/40 font-mono">paused</div>
                        )}
                      </div>
                    </div>

                    {/* Step Timeline */}
                    <div className="flex-1 flex flex-col gap-4 text-left">
                      {emailPresets
                        .find(p => p.id === activePreset)
                        ?.steps.map((step, idx) => {
                          const isCompleted = idx < simStep;
                          const isCurrent = idx === simStep;
                          const isFuture = idx > simStep;

                          return (
                            <div 
                              key={idx} 
                              className={`flex items-start gap-4 transition-all duration-300 ${
                                isFuture ? 'opacity-25' : 'opacity-100'
                              }`}
                            >
                              <div className="mt-1 shrink-0">
                                {isCompleted ? (
                                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h5 className={`text-xs font-semibold ${isCurrent ? 'text-blue-400' : 'text-white/80'}`}>
                                  {step.label}
                                </h5>
                                <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Approve Action Step */}
                    {!simRunning && simStep === 4 && (
                      <div className="mt-6 pt-5 border-t border-white/5 animate-fade-up">
                        {!simApproved ? (
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="text-xs font-bold text-white">Quotation Generated & Ready</h5>
                                <p className="text-[10px] text-white/45 mt-0.5">Please approve the dispatch to send the email.</p>
                              </div>
                              <span className="text-xs font-mono font-bold text-emerald-400">Q-871{activePreset === 'stark' ? '0' : '1'}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={approveSimQuote}
                                className="flex-1 bg-white hover:bg-white/90 text-black text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve & Dispatch
                              </button>
                              <button 
                                onClick={() => startPresetSimulation(activePreset)}
                                className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                              >
                                Restart
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3 text-left">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                            <div>
                              <h5 className="text-xs font-bold text-emerald-400">Workflow Dispatched successfully!</h5>
                              <p className="text-[10px] text-emerald-300/60 leading-relaxed mt-1">
                                Email reply sent with the PDF quote attached. Lead records successfully generated on CRM and callback follow-ups scheduled on Google Calendar.
                              </p>
                              <Link 
                                to="/dashboard" 
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-white mt-3 hover:underline"
                              >
                                Open Full App Dashboard
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
                
              </div>

            </div>

          </div>
        </section>

        {/* WORKFLOW ROADMAP (HOW IT WORKS) */}
        <section className="py-24 border-t border-white/5 bg-[#0c0c0e]">
          <div className="max-w-7xl mx-auto px-5">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#28c840] uppercase">Operation Flow</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">From Inbound to Closed Deal</h2>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">
                Flow handles the friction-filled mid-office workflow automatically, saving hours of manual data entry and email copywriting.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Mail, title: '1. Inbound intake', desc: 'A customer emails your sales address requesting pricing or stock details.' },
                { icon: Search, title: '2. Intent & RAG search', desc: 'Flow extracts intent and queries your uploaded PDFs for pricing rules.' },
                { icon: FileText, title: '3. Quote generation', desc: 'Checks stock in inventory and automatically generates a PDF quotation draft.' },
                { icon: ShieldCheck, title: '4. Human approval', desc: 'The sales manager reviews, edits, or approves the draft quote in the dashboard.' },
                { icon: Send, title: '5. Dispatch & CRM sync', desc: 'Approved quote is sent to the client, CRM updates, and calendar follow-ups are set.' }
              ].map((step, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col items-start relative hover:border-white/10 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-white/70" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[11px] text-white/45 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section className="py-24 border-t border-white/5 bg-[#0a0a0c]">
          <div className="max-w-4xl mx-auto px-5">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-blue-400 uppercase">ROI Calculator</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">Calculate Your Efficiency Gains</h2>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">
                See exactly how many hours and dollars Flow saves your business by automating inbound enquiries.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 items-center p-8 rounded-2xl bg-white/[0.02] border border-white/5">
              
              {/* Sliders (Left) */}
              <div className="flex flex-col gap-6 text-left">
                
                {/* Slider 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-white/80">
                    <span>DAILY INBOUND ENQUIRIES</span>
                    <span className="text-blue-400 font-mono text-sm">{dailyEmails} / day</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={dailyEmails}
                    onChange={(e) => setDailyEmails(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <span className="text-[10px] text-white/30">Average leads received per working day.</span>
                </div>

                {/* Slider 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-white/80">
                    <span>MANUAL TIME PER EMAIL</span>
                    <span className="text-blue-400 font-mono text-sm">{avgHandlingTime} mins</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={avgHandlingTime}
                    onChange={(e) => setAvgHandlingTime(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <span className="text-[10px] text-white/30">Includes reading, manual RAG check, CRM lookups, and writing.</span>
                </div>

              </div>

              {/* Calculator Output (Right) */}
              <div className="grid grid-cols-2 gap-4">
                
                <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-center text-left">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                    <Clock className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div className="text-[9px] tracking-wider text-white/30 font-semibold mb-1 uppercase">Time Saved / Month</div>
                  <div className="text-2xl font-bold text-white font-mono">{timeSavedHrs} <span className="text-xs font-normal text-white/40">hrs</span></div>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-center text-left">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                    <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div className="text-[9px] tracking-wider text-white/30 font-semibold mb-1 uppercase">Monthly Savings</div>
                  <div className="text-2xl font-bold text-white font-mono">${moneySaved.toLocaleString()}</div>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-center text-left">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                    <Zap className="w-4.5 h-4.5 text-orange-400" />
                  </div>
                  <div className="text-[9px] tracking-wider text-white/30 font-semibold mb-1 uppercase">Response Time</div>
                  <div className="text-2xl font-bold text-white font-mono">&lt; 10 <span className="text-xs font-normal text-white/40">sec</span></div>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-center text-left">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                    <Users className="w-4.5 h-4.5 text-purple-400" />
                  </div>
                  <div className="text-[9px] tracking-wider text-white/30 font-semibold mb-1 uppercase">Lead Speedup</div>
                  <div className="text-2xl font-bold text-white font-mono">24× <span className="text-xs font-normal text-white/40">faster</span></div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* FEATURES BENTO GRID (TOOLKIT) */}
        <section className="py-24 border-t border-white/5 bg-[#0c0c0e]">
          <div className="max-w-5xl mx-auto px-5">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#28c840] uppercase">System Toolkit</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">The Complete AI Sales Ops Toolkit</h2>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">
                Everything you need to automate your inbound client communications. Fully sandboxed database, custom RAG indexing, and seamless OAuth configurations.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Card 1: Monorepo Email Parser */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                    <Mail className="w-5 h-5 text-white/70" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Autonomous Inbound Email Parser</h3>
                  <p className="text-xs text-white/45 leading-relaxed">
                    Instantly hooks into your business inbox via secure Google OAuth. The LLM extracts intents, required quantities, and client profiles from incoming emails with 98% accuracy.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">Google Gmail OAuth</span>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">Intent Classification</span>
                </div>
              </div>

              {/* Card 2: Custom RAG Ingest */}
              <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                    <Search className="w-5 h-5 text-white/70" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Custom RAG Indexer</h3>
                  <p className="text-xs text-white/45 leading-relaxed">
                    Upload pricing tier sheets and catalogs in Markdown. Flow instantly builds semantic vector indices to pull accurate numbers.
                  </p>
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">Vector Search</span>
                </div>
              </div>

              {/* Card 3: Auto-Quotation Engine */}
              <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                    <FileText className="w-5 h-5 text-white/70" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Quotation PDF Generator</h3>
                  <p className="text-xs text-white/45 leading-relaxed">
                    Constructs formatted, structured quotation documents containing unit prices, bulk discount calculations, tax, and terms.
                  </p>
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">PDF Compiler</span>
                </div>
              </div>

              {/* Card 4: Multi-Tenant Schema */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                    <Layers className="w-5 h-5 text-white/70" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Multi-Tenant Postgres Schema Separation</h3>
                  <p className="text-xs text-white/45 leading-relaxed">
                    SaaS-grade security architecture: every company workspace is isolated within its own dedicated PostgreSQL schema inside Supabase, driven dynamically by HTTP session headers. No cross-tenant data leaks.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">PostgreSQL Schema Isolation</span>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 text-white/50">Supabase DB</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* SECURITY & SAFEGARDS SECTION */}
        <section className="py-24 border-t border-white/5 bg-[#0a0a0c]">
          <div className="max-w-4xl mx-auto px-5 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-6">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-normal tracking-tight text-white mb-4">Enterprise Safety & Guardrails</h2>
            <p className="text-white/50 text-sm max-w-2xl leading-relaxed mb-10">
              Unlike generic AI wrappers that autonomously send unverified emails, Flow is designed with strict business guardrails. The AI only operates in a <strong>Draft state</strong>, requiring human verification before any outward dispatch occurs.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 text-left w-full">
              <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5">
                <h4 className="text-xs font-bold text-white mb-2">Human-in-the-Loop</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">Manager must explicitly approve all generated quotation drafts and email replies in the control panel.</p>
              </div>
              <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5">
                <h4 className="text-xs font-bold text-white mb-2">Dynamic CRM Syncing</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">Once approved, leads are instantly created in Salesforce or HubSpot, maintaining client sync metrics.</p>
              </div>
              <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5">
                <h4 className="text-xs font-bold text-white mb-2">Sandbox Security</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">RAG documents are stored inside individual session buckets on isolated writable volumes (/tmp/knowledge).</p>
              </div>
            </div>
          </div>
        </section>

        {/* SAAS PRICING TIERS */}
        <section className="py-24 border-t border-white/5 bg-[#0c0c0e]">
          <div className="max-w-5xl mx-auto px-5">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-blue-400 uppercase">SaaS Pricing</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">Simple, Transparent Pricing</h2>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">
                Start with our 14-day free trial. No credit card required. Upgrade as your operations scale.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-stretch">
              
              {/* Starter Tier */}
              <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col text-left">
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white/60">Free Trial</h4>
                  <div className="text-3xl font-bold font-mono text-white mt-2">$0 <span className="text-xs font-normal text-white/40">/ month</span></div>
                  <p className="text-[10px] text-white/40 mt-2">Perfect for evaluation and testing.</p>
                </div>
                <hr className="border-white/5 mb-6" />
                <ul className="flex-1 flex flex-col gap-3 text-xs text-white/60 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Up to 50 emails / month</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1 Connected Inbox</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Basic RAG (up to 5 docs)</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Manual email simulation</li>
                </ul>
                <Link to="/onboarding" className="w-full text-center py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
                  Start Trial
                </Link>
              </div>

              {/* Growth Tier (Featured) */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border-2 border-blue-500/30 flex flex-col text-left relative">
                <div className="absolute top-4 right-4 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500 text-white">POPULAR</div>
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-blue-400">Growth Plan</h4>
                  <div className="text-3xl font-bold font-mono text-white mt-2">$49 <span className="text-xs font-normal text-white/40">/ month</span></div>
                  <p className="text-[10px] text-white/40 mt-2">For growing sales teams seeking automation.</p>
                </div>
                <hr className="border-white/5 mb-6" />
                <ul className="flex-1 flex flex-col gap-3 text-xs text-white/80 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Up to 1,000 emails / month</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 3 Connected Inboxes</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Advanced RAG (up to 50 docs)</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Full CRM HubSpot/SF Integration</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Real-time log diagnostics</li>
                </ul>
                <Link to="/onboarding" className="w-full text-center py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20">
                  Get Started
                </Link>
              </div>

              {/* Enterprise Tier */}
              <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col text-left">
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white/60">Enterprise</h4>
                  <div className="text-3xl font-bold font-mono text-white mt-2">Custom</div>
                  <p className="text-[10px] text-white/40 mt-2">For large-scale departments with custom SLAs.</p>
                </div>
                <hr className="border-white/5 mb-6" />
                <ul className="flex-1 flex flex-col gap-3 text-xs text-white/60 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited email streams</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Custom private database schema</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Dedicated RAG context vectors</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> SLA & 24/7 dedicated support</li>
                </ul>
                <button className="w-full text-center py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
                  Contact Sales
                </button>
              </div>

            </div>

          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="py-24 border-t border-white/5 bg-[#0a0a0c]">
          <div className="max-w-3xl mx-auto px-5 text-left">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[10px] font-mono tracking-[0.2em] text-blue-400 uppercase">Knowledge Base</span>
              <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3 text-center">Frequently Asked Questions</h2>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  q: "How secure is Flow? Can the AI send emails without my approval?",
                  a: "Flow is built on a strict 'Human-in-the-loop' design. When an inbound inquiry is processed, the state machine generates a draft quotation and response email, then pauses. The workflow will remain in a pending state until a human manager logs in and explicitly clicks 'Approve' or 'Reject' in the dashboard control panel."
                },
                {
                  q: "How does the multi-tenant database isolation work?",
                  a: "To ensure enterprise-grade isolation and avoid data leaks, Flow uses PostgreSQL schema separation. Every registered company workspace onboards into a separate database schema dynamically mapped using secure session ID tokens. Your catalogs, credentials, and inbox data are never co-mingled."
                },
                {
                  q: "Can I import my own custom pricing and FAQ documents?",
                  a: "Yes! During the onboarding process (or from the Knowledge Base tab on the dashboard), you can upload any pricing sheets or product manuals in Markdown format. Flow instantly indexes them into an in-memory TF-IDF semantic vector space for RAG."
                },
                {
                  q: "Does this support HubSpot, Salesforce, and other custom CRMs?",
                  a: "Yes. In the workflow settings, you can toggle CRM synchronization. Flow has built-in integration support to create qualified leads, record customer profiles, and synchronize calculated deal values automatically."
                }
              ].map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="rounded-xl bg-white/[0.01] border border-white/5 overflow-hidden transition-all">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left font-medium text-white/95 hover:bg-white/[0.02] transition-colors gap-4"
                    >
                      <span className="text-sm">{faq.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-xs text-white/50 leading-relaxed border-t border-white/5 bg-white/[0.005]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* BOTTOM FINAL CALL TO ACTION (CTA) */}
        <section className="py-24 border-t border-white/5 bg-[#0c0c0e] relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 rounded-full filter blur-[150px] pointer-events-none -z-10" />
          <div className="max-w-4xl mx-auto px-5 text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mb-5">Automate Your Mid-Office Operations Today</h2>
            <p className="text-white/50 text-sm max-w-xl leading-relaxed mb-8">
              Join our 14-day trial. Setup your workspace, connect your inbox, and let your new autonomous digital employee handle lead ops.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/onboarding" className="bg-white text-black text-sm font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-colors shadow-lg shadow-white/5">
                Start Free Trial
              </Link>
              <Link to="/how-it-works" className="text-white/80 text-sm font-semibold px-6 py-3 rounded-full ring-1 ring-white/10 hover:bg-white/5 transition-colors">
                Learn How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-black/60 border-t border-white/5 py-12 relative z-10 text-center">
          <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-white/70" />
              <span className="text-white font-bold text-sm tracking-tight">Flow <span className="text-[10px] font-normal text-white/30">by Hackarena</span></span>
            </div>
            <p className="text-white/35 text-xs">© 2026 Flow by Hackarena. All rights reserved.</p>
            <div className="flex gap-6 text-xs text-white/45">
              <Link to="/how-it-works" className="hover:text-white">How it Works</Link>
              <Link to="/toolkit" className="hover:text-white">Toolkit</Link>
              <Link to="/ppt" className="hover:text-white">Presentation</Link>
            </div>
          </div>
        </footer>

      </div>
    </PageTransition>
  );
}
