import { Anchor, ShieldAlert, Compass } from 'lucide-react';

export default function Header() {
  return (
    <header id="header-container" className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-450 text-sky-400">
            <Anchor className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono font-semibold text-sky-400 tracking-widest uppercase">AI-Powered Harbor Ops</span>
            <h1 className="text-xl md:text-2xl font-display font-medium text-white tracking-tight">
              Container Terminal Planning Assistant
            </h1>
          </div>
        </div>

        {/* Disclaimer Area */}
        <div id="disclaimer-alert" className="flex items-start md:items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs max-w-xl">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <span className="font-semibold text-amber-400">Decision-Support Prototype:</span> This artificial intelligence tool provides operational estimates. Final terminal planning decisions must be carefully reviewed and signed off by qualified marine superintendents and yard master planners.
          </div>
        </div>
      </div>
    </header>
  );
}
