import { useLocation } from 'react-router-dom';

export function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace('-', ' ') || 'Page';
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-20">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <span className="text-2xl opacity-50">🚧</span>
      </div>
      <h1 className="text-2xl font-semibold text-white mb-3 capitalize">
        {pageName}
      </h1>
      <p className="text-white/50 text-sm leading-relaxed">
        This section is currently under development. The full feature will be available shortly as we continue to build out the dashboard.
      </p>
    </div>
  );
}
