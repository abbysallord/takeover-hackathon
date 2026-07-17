import { Navbar } from '../components/Navbar';
import { ToolkitSection } from '../components/landing/ToolkitSection';

export function ToolkitPage() {
  return (
    <div className="bg-[#0c0c0e] min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-12">
        <ToolkitSection />
      </div>
      <footer className="bg-black/60 border-t border-white/5 py-12 text-center">
        <p className="text-white/35 text-xs">© 2026 Flow by Hackarena. All rights reserved.</p>
      </footer>
    </div>
  );
}
