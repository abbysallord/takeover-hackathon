import { Navbar } from '../components/Navbar';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';

export function HowItWorksPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-12">
        <HowItWorksSection />
      </div>
      <footer className="bg-gray-900 py-12 text-center">
        <p className="text-gray-400 text-sm">© 2026 FlowOps AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
