import { Mail, Search, FileText, Bot, Zap, Database } from 'lucide-react';

export function ToolkitSection() {
  const features = [
    {
      icon: Mail,
      title: 'Email Parsing',
      description: 'Automatically extract intent, entities, and urgency from inbound emails using advanced NLP.'
    },
    {
      icon: Search,
      title: 'RAG Knowledge',
      description: 'Instantly query your internal docs to find the exact answers needed to formulate a response.'
    },
    {
      icon: FileText,
      title: 'Auto-Quotation',
      description: 'Generate dynamic PDF quotes based on real-time inventory and standard pricing models.'
    },
    {
      icon: Bot,
      title: 'AI Drafting',
      description: 'Draft hyper-personalized, context-aware email replies in your brand voice.'
    },
    {
      icon: Database,
      title: 'CRM Sync',
      description: 'Keep Salesforce or HubSpot perfectly updated without lifting a finger.'
    },
    {
      icon: Zap,
      title: 'Workflow Automation',
      description: 'String all these capabilities together into a seamless, zero-touch operational pipeline.'
    }
  ];

  return (
    <section id="toolkit" className="py-24 bg-white relative z-10">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">The Complete AI Toolkit</h2>
          <p className="text-gray-600">Everything you need to automate your sales operations from end to end. Replace manual data entry with intelligent pipelines.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gray-50 ring-1 ring-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-5 shadow-lg">
                <feat.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">{feat.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
