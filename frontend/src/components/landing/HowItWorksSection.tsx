import { Mail, Search, FileText, CheckCircle2, Send } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: Mail,
      title: '1. Customer Inbound',
      description: 'A potential customer sends an email asking for pricing, product details, or support.'
    },
    {
      icon: Search,
      title: '2. AI Extraction & RAG',
      description: 'Flow instantly reads the email, extracts key entities, and searches your knowledge base.'
    },
    {
      icon: FileText,
      title: '3. Automated Generation',
      description: 'It drafts a personalized reply and automatically generates a PDF quotation based on your pricing.'
    },
    {
      icon: CheckCircle2,
      title: '4. One-Click Approval',
      description: 'Your sales manager reviews the drafted response in the dashboard and clicks approve.'
    },
    {
      icon: Send,
      title: '5. Instant Dispatch',
      description: 'The perfectly drafted email and quote are sent back to the customer in record time.'
    }
  ];

  return (
    <section className="py-24 bg-[#0c0c0e] relative z-10">
      {/* Glowing Mesh Gradients */}
      <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-blue-400 uppercase">Operation Flow</span>
          <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-white mt-3">How Flow Works</h2>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">See how an inbound sales enquiry is transformed into a closed deal in seconds, without manual data entry.</p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-10 right-10 h-0.5 bg-white/5" />
            
            <div className="grid md:grid-cols-5 gap-8 relative z-10">
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border-2 border-white/5 shadow-sm flex items-center justify-center mb-6 relative group hover:border-white/20 transition-all duration-300">
                    <step.icon className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
                    {i < steps.length - 1 && (
                      <div className="md:hidden absolute -bottom-8 left-1/2 w-0.5 h-6 bg-white/5 -translate-x-1/2" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-white/45 leading-relaxed px-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
