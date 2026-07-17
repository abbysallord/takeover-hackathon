import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, Shield, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function TermsPage() {
  return (
    <PageTransition>
      <div className="bg-[#0c0c0e] text-white min-h-screen flex flex-col relative overflow-hidden font-sans">
        {/* Decorative Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />

        {/* Header */}
        <header className="relative z-10 max-w-4xl mx-auto w-full px-6 pt-10 pb-6 border-b border-white/5 flex justify-between items-center">
          <Link to="/" className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-mono transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK TO HOMEPAGE
          </Link>
          <div className="flex items-center gap-2 text-blue-400 font-mono text-xs">
            <Scale className="w-4 h-4" />
            <span>TERMS OF SERVICE</span>
          </div>
        </header>

        {/* Content */}
        <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 flex-1 w-full text-left">
          <h1 className="text-4xl font-normal tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-xs font-mono text-white/40 mb-10">Last Updated: July 17, 2026</p>

          <section className="mb-10 text-white/70 text-sm leading-relaxed space-y-4">
            <p>
              Welcome to Flow. By accessing or using our application, you agree to comply with and be bound by these Terms of Service. Please read them carefully before connecting your business accounts or integrating our autonomous sales agents.
            </p>
          </section>

          {/* Quick Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <Shield className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">User Authorization</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                You explicitly authorize Flow to monitor your connected Gmail inbox, query your RAG knowledge databases, and draft sales follow-up responses on your behalf.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">Human Approval Rule</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                Flow provides draft recommendations. Unless explicitly configured, all outgoing sales emails and pricing sheets require human approval before being transmitted.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">AI Generation Notice</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                Flow utilizes language models to synthesize emails and quotes. The user is responsible for reviewing and verifying the accuracy of pricing, specifications, and client details.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <FileText className="w-5 h-5 text-purple-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">Acceptable Use</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                You agree not to use Flow to generate spam, conduct phishing attempts, distribute malicious code, or send bulk unsolicited advertisements.
              </p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-8 text-sm text-white/70 leading-relaxed">
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">1. Service Description</h2>
              <p>
                Flow is an AI-powered sales copilot that acts as an autonomous sales agent for your business. The service connects to your Gmail account to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2 text-xs text-white/60">
                <li>Identify sales leads from incoming messages.</li>
                <li>Compare customer requirements against your catalog database.</li>
                <li>Generate and draft responses, proposals, and pricing documents.</li>
                <li>Send responses directly from your connected email after confirmation.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">2. Account Registration and Security</h2>
              <p>
                To utilize Flow, you must link your business Google account via OAuth. You are responsible for maintaining the confidentiality of your workspace parameters and all actions taken within your tenant schema. Flow is not liable for unauthorized access resulting from compromised Google credentials or local security breaches on your device.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">3. Intellectual Property and Content</h2>
              <p>
                Your uploaded catalogs, databases, templates, and customer communications remain entirely your property. Flow claims no ownership over the raw files or communications processed. Flow grants you a limited, non-exclusive, non-transferable license to access the platform and run the sales automation system.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">4. Limitation of Liability and Disclaimers</h2>
              <p>
                FLOW IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE MAKE NO WARRANTIES regarding the accuracy, completeness, or reliability of AI-generated content (including email text, quote parameters, and database matches). 
              </p>
              <p className="mt-2">
                In no event shall Flow be liable for lost profits, direct or indirect damages, or transaction disputes arising from automated emails sent to your clients. The final validation of pricing and inventory quotes lies solely with the business operator.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">5. Termination of Service</h2>
              <p>
                You may terminate your agreement with Flow at any time by revoking our application access in your Google account settings and deleting your workspace tenant database from our system. Flow reserves the right to suspend or block accounts violating our Acceptable Use standards.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">6. Contact Information</h2>
              <p>
                If you have questions regarding these Terms of Service, please contact us at:
                <span className="text-blue-400 font-medium ml-1">support@company.com</span>.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5 text-center text-xs text-white/30 font-mono">
          &copy; 2026 Flow Operations Agent. All Rights Reserved.
        </footer>
      </div>
    </PageTransition>
  );
}
