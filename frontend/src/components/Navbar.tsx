import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ChevronDown, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="animate-fade-down relative z-20">
      <div className="flex flex-row items-center justify-between px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
        
        {/* Logo Left */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-white font-bold text-xl tracking-tight">
            Flow <span className="text-sm font-normal text-white/30">by Hackarena</span>
          </span>
        </Link>

        {/* Desktop Nav Center */}
        <div className="hidden md:flex items-center justify-center gap-8 text-[13px] text-white/70">
          <Link to="/how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link to="/toolkit" className="hover:text-white transition-colors flex items-center gap-1">
            Toolkit <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </Link>
          <Link to="/ppt" className="hover:text-white transition-colors">Presentation</Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="hidden md:block bg-white text-black text-[13px] font-semibold px-4 sm:px-5 py-2 rounded-full hover:bg-white/90 transition-colors">
            Start Workflow
          </Link>
          
          {/* Hamburger (Mobile) */}
          <button 
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="absolute left-4 right-4 top-full rounded-2xl bg-[#131315]/95 backdrop-blur-xl ring-1 ring-white/10 px-5 py-3 animate-fade-up md:hidden z-50">
          <div className="flex flex-col">
            <Link to="/how-it-works" onClick={() => setIsOpen(false)} className="text-[15px] text-white/70 hover:text-white border-b border-white/5 py-3">How it Works</Link>
            <Link to="/toolkit" onClick={() => setIsOpen(false)} className="text-[15px] text-white/70 hover:text-white border-b border-white/5 py-3">Toolkit</Link>
            <Link to="/ppt" onClick={() => setIsOpen(false)} className="text-[15px] text-white/70 hover:text-white border-b border-white/5 py-3">Presentation</Link>
            <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-[15px] text-white hover:text-white py-3 font-semibold text-white">Start Workflow</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
