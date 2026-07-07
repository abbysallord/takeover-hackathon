import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function PresentationPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="w-screen h-screen bg-[#030303] relative overflow-hidden">
        
        {/* Floating exit button so you aren't trapped on this page */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all group shadow-lg"
          title="Exit Presentation"
        >
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Fullscreen Canva Embed */}
        <iframe 
          loading="lazy" 
          className="w-full h-full border-none absolute inset-0"
          src="https://www.canva.com/design/DAHOrVFfJy8/8420kmAgpM2oPjiycUP-xQ/view?embed" 
          allowFullScreen={true}
          allow="fullscreen"
          title="Flow Presentation"
        ></iframe>
        
      </div>
    </PageTransition>
  );
}
