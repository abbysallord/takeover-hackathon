import { Navbar } from './Navbar';
import { ArrowUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ScaledDashboard } from './ScaledDashboard';
import { DashboardMockup } from './DashboardMockup';
import { PageTransition } from './PageTransition';

export function Hero() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/dashboard/inbox?demo=true&q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <PageTransition>
      <section 
        className="relative min-h-[100svh] overflow-hidden bg-cover bg-center flex flex-col"
        style={{ backgroundImage: `url('https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260611_133301_d5f2a94a-b22e-4e4a-a6b6-eacdddf1f5b0.png&w=1280&q=85')` }}
      >
        <Navbar />

      <div className="flex-1 min-h-8 sm:min-h-12 lg:min-h-16 shrink-0" />

      <div className="relative z-20 flex flex-col items-center text-center px-5">
        
        <h1 className="text-gray-900 font-normal leading-[1.05] tracking-tight flex flex-col">
          <span className="text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px] animate-fade-up">
            Automate Sales.
          </span>
          <span className="text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px] animate-fade-up [animation-delay:100ms]">
            Intelligently.
          </span>
        </h1>

        <div className="animate-fade-up [animation-delay:220ms] mt-5 sm:mt-6 w-full max-w-xl">
          <form className="flex items-center gap-3 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-gray-200 pl-5 pr-1.5 py-1.5" onSubmit={handleDemoSubmit}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste a customer enquiry..." 
              className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 outline-none py-2"
            />
            <button 
              type="submit" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shrink-0"
            >
              <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </form>
        </div>

        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          Turn inbound enquiries into automated workflows.<br />From email to approved quotation, instantly.
        </p>

        <div className="animate-fade-up [animation-delay:460ms] mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard" className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-gray-800 hover:shadow-lg transition-all">
            Start Workflow
          </Link>
          <button className="text-gray-700 text-sm font-medium px-6 py-2.5 rounded-full ring-1 ring-gray-300 hover:bg-gray-100 transition-colors">
            View Demo
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      <div className="animate-hero-rise [animation-delay:620ms] relative z-0 w-[92%] sm:w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-10 sm:-mb-20 lg:-mb-32">
        <ScaledDashboard>
          <DashboardMockup />
        </ScaledDashboard>
      </div>

        <img 
          src="https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1781191264/grass_eam204.png" 
          alt="" 
          className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none"
        />
      </section>
    </PageTransition>
  );
}
