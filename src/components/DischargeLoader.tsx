import { useEffect, useState } from 'react';
import { RefreshCw, Terminal, Anchor, Ship, Layers } from 'lucide-react';
import { motion } from 'motion/react';

const logPhases = [
  "Establishing secure satellite link to berth telemetry...",
  "Calibrating crane dual-cycle move coefficients...",
  "Measuring container stacking density in blocks A3 through F4...",
  "Running Monte Carlo collision pathways for terminal trucks...",
  "Interrogating reefer plug availability matrix...",
  "Evaluating restow and lashing requirements for over-height hatches...",
  "Structuring tactical yard mitigation recommendations...",
  "Finalizing predictive vessel turnaround report..."
];

export default function DischargeLoader() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % logPhases.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="loader-panel" className="flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-slate-800 rounded-2xl min-h-[400px]">
      <div className="relative mb-6">
        {/* Animated outer ring */}
        <div className="absolute inset-0 w-20 h-20 border-t-2 border-r-2 border-sky-500 rounded-full animate-spin"></div>
        {/* Animated inner reverse ring */}
        <div className="absolute inset-2 w-16 h-16 border-b-2 border-l-2 border-teal-400 rounded-full animate-spin [animation-duration:1.5s]"></div>
        {/* Central icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 shadow-inner">
          <Ship className="w-8 h-8 text-sky-400 animate-bounce" />
        </div>
      </div>

      <h3 className="text-lg font-display text-white mb-2 tracking-tight">
        Optimizing Carrier Sequence
      </h3>
      
      <p className="text-sm text-slate-400 mb-8 max-w-sm text-center">
        The AI agent is calculating optimal crane movements and estimating total berth turnaround cycles.
      </p>

      {/* Terminal logs box */}
      <div className="w-full max-w-lg bg-slate-950 rounded-xl p-4 border border-slate-850 font-mono text-xs text-sky-400/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] text-slate-500 uppercase">Live Optimizer Terminal</span>
          </div>
          <span className="text-[10px] text-slate-500">PORT_OPS_SYS v3.55</span>
        </div>

        <div className="space-y-2.5 h-28 overflow-hidden flex flex-col justify-end">
          <div className="text-slate-600"> [SYSTEM] Init vessel sequence matrix... Success</div>
          <div className="text-slate-600"> [STOWAGE] Reading load list bay files... Success</div>
          <div className="text-slate-400">
            [YARD] Yard congestion set to processing mode.
          </div>
          <motion.div
            key={phaseIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-teal-400 flex items-center gap-2 font-semibold"
          >
            <span className="text-slate-500">&gt;&gt;</span> {logPhases[phaseIndex]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
