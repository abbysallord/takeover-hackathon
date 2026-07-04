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
          <Logo className="text-gray-900 w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-gray-900 font-bold text-xl tracking-tight">
            Flow <span className="text-sm font-normal text-gray-500">by Hackarena</span>
          </span>
        </Link>

        {/* Desktop Nav Center */}
        <div className="hidden md:flex items-center justify-center gap-8 text-[13px] text-gray-700">
          <Link to="/how-it-works" className="hover:text-gray-900">How it Works</Link>
          <Link to="/toolkit" className="hover:text-gray-900 flex items-center gap-1">
            Toolkit <ChevronDown className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="hidden md:block bg-gray-900 text-white text-[13px] font-medium px-4 sm:px-5 py-2 rounded-full hover:bg-gray-800 transition-colors">
            Start Workflow
          </Link>
          
          {/* Hamburger (Mobile) */}
          <button 
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-gray-900 hover:bg-gray-900/10 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="absolute left-4 right-4 top-full rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-gray-200 px-5 py-3 animate-fade-up md:hidden">
          <div className="flex flex-col">
            <Link to="/how-it-works" onClick={() => setIsOpen(false)} className="text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-200 py-3">How it Works</Link>
            <Link to="/toolkit" onClick={() => setIsOpen(false)} className="text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-200 py-3">Toolkit</Link>
            <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-[15px] text-gray-700 hover:text-gray-900 py-3 font-medium text-gray-900">Start Workflow</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
