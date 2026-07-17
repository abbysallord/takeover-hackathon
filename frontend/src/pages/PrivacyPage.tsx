import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Lock, Eye, Trash2 } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function PrivacyPage() {
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
            <Shield className="w-4 h-4" />
            <span>PRIVACY CENTER</span>
          </div>
        </header>

        {/* Content */}
        <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 flex-1 w-full text-left">
          <h1 className="text-4xl font-normal tracking-tight text-white mb-2">Privacy Policy</h1>
          <p className="text-xs font-mono text-white/40 mb-10">Last Updated: July 17, 2026</p>

          <section className="mb-10 text-white/70 text-sm leading-relaxed space-y-4">
            <p>
              Welcome to Flow. We respect your privacy and are committed to protecting your personal data. 
              This Privacy Policy explains how our application connects to your Google accounts (specifically Gmail) 
              and how we handle, store, and safeguard your data to remain fully compliant with the <strong>Google API Services User Data Policy</strong>.
            </p>
          </section>

          {/* Quick Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <Mail className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">Strict Scope Limitation</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                We request read access to download customer sales inquiries and send access to deliver approved quotations. We do not access private correspondence.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <Lock className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">Enterprise-Grade Isolation</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                Your synced emails, leads, and quotes are stored within isolated PostgreSQL schemas per workspace. Data is never co-mingled or leaked.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <Eye className="w-5 h-5 text-purple-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">No Third-Party Sharing</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                Your emails are never shared, sold, or used for advertising. We strictly process email content to draft quotations on your behalf.
              </p>
            </div>
            <div className="bg-white/[0.02] ring-1 ring-white/5 p-5 rounded-2xl">
              <Trash2 className="w-5 h-5 text-red-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">Complete Data Control</h3>
              <p className="text-xs text-white/55 leading-relaxed">
                At any time, you can purge your workspace cache, delete your files, and revoke Google connection credentials from the settings panel.
              </p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-8 text-sm text-white/70 leading-relaxed">
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>
                When you connect your Google/Gmail account to Flow, we request the following scopes:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2 text-xs text-white/60">
                <li>
                  <strong>https://www.googleapis.com/auth/gmail.readonly</strong>: To read incoming customer emails to identify inquiries, quotes, and product requests.
                </li>
                <li>
                  <strong>https://www.googleapis.com/auth/gmail.send</strong>: To reply to customers with drafts, follow-ups, and quotation invoices after your approval.
                </li>
                <li>
                  <strong>https://www.googleapis.com/auth/userinfo.email</strong>: To display your connected business email address on the dashboard workspace profile.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">2. Google Limited Use Policy Compliance</h2>
              <p>
                Flow's use and transfer of information received from Google APIs to any other app will adhere to the 
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline mx-1"
                >
                  Google API Services User Data Policy
                </a>, including the <strong>Limited Use</strong> requirements.
              </p>
              <p className="mt-2">
                We do not transfer your Gmail data to external advertising services, list brokers, or third-party analytical pipelines. 
                Data processing is conducted strictly in memory or within your dedicated local database schema instance to run RAG search algorithms and generate agent decisions.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">3. How We Use the Data</h2>
              <p>
                The information is used solely to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-white/60">
                <li>Parse inbound product request quantities and items.</li>
                <li>Search your uploaded company catalogs (RAG) to find specifications.</li>
                <li>Draft formal quotations and response mail proposals.</li>
                <li>Send responses to customers after you click approve in the dashboard.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">4. Security of Your Data</h2>
              <p>
                We employ standard industry security protocols to protect your credentials and data. Google access tokens are encrypted at rest, and session parameters are dynamically isolated in memory using context variables to prevent tenant leaks.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">5. Contact Information</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at 
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
