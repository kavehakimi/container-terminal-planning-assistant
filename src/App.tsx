import { useState, useEffect } from 'react';
import { 
  Anchor, 
  Ship, 
  Layers, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Send, 
  FileText, 
  Check, 
  Copy, 
  Gauge, 
  Info,
  Compass,
  ArrowRight,
  TrendingUp,
  Hammer,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Truck,
  Activity,
  Database,
  Wifi,
  WifiOff,
  Server,
  ShieldAlert,
  Shield,
  History,
  UserCheck,
  Cpu,
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import Header from './components/Header';
import DischargeLoader from './components/DischargeLoader';
import { TerminalPlanningInput, TerminalPlanningOutput } from './types';
import terminalImage from './assets/images/container_terminal_1781704984187.jpg';

// Preset templates for quick filling and testing
const PRESETS = [
  {
    name: "Panamax 'Oceania Express' (Critical Turn)",
    vesselName: "Oceania Express v204",
    dischargeCount: 1450,
    loadCount: 980,
    cranesCount: 4,
    craneProductivity: 28,
    congestion: "High" as const,
    priority: "Critical" as const,
    notes: "Vessel carries 45 dangerous cargo reefers (IMO Class 3) in Bay 14. Severe outbound train delays scheduled for tonight."
  },
  {
    name: "Feeder 'CMA CGM Blue Marlin' (Fast Discharge)",
    vesselName: "CMA CGM Blue Marlin v01",
    dischargeCount: 420,
    loadCount: 150,
    cranesCount: 2,
    craneProductivity: 25,
    congestion: "Low" as const,
    priority: "Urgent" as const,
    notes: "Requires fast 6-hour quay turnaround. Restow required on hatch cover #3."
  },
  {
    name: "Megaship 'MSC Daniela' (Standard Mega Load)",
    vesselName: "MSC Daniela v419",
    dischargeCount: 2800,
    loadCount: 3100,
    cranesCount: 5,
    craneProductivity: 32,
    congestion: "Medium" as const,
    priority: "Normal" as const,
    notes: "Twin lifts enabled on hatch groups 2 to 7. Special oversized wind-turbine blade components stowed on deck starboard side."
  }
];

export default function App() {
  const [inputs, setInputs] = useState<TerminalPlanningInput>({
    vesselName: "Deneb Leader v12",
    dischargeCount: 850,
    loadCount: 620,
    cranesCount: 3,
    craneProductivity: 27,
    congestion: 'Medium',
    priority: 'Normal',
    notes: "Reefer monitoring requested for block G19. Direct truck-delivery containers expected for dangerous cargo containers."
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<TerminalPlanningOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'vessel' | 'cranes' | 'yard' | 'risks' | 'decision'>('all');
  const [copied, setCopied] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  // New States for Secure Agent Features
  const [decisionStatus, setDecisionStatus] = useState<'Pending Review' | 'Approved' | 'Revision Requested' | 'Rejected'>('Pending Review');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [revisionHistory, setRevisionHistory] = useState<Array<{
    versionFrom: number;
    versionTo: number;
    timestamp: string;
    notes: string;
    diff: {
      durationFrom: number;
      durationTo: number;
      cranesFrom: number;
      cranesTo: number;
      congestionFrom: string;
      congestionTo: string;
      safetyFrom: number;
      safetyTo: number;
    }
  }>>([]);
  const [auditTrail, setAuditTrail] = useState<Array<{
    id: string;
    vessel: string;
    timestamp: string;
    user: string;
    action: string;
    risk: 'Low' | 'Medium' | 'High';
    status: 'Pending' | 'Approved' | 'Revision Requested' | 'Rejected';
    skillsExecuted: string[];
    details: string;
  }>>([
    {
      id: "TX-9048",
      vessel: "MSC Daniela v419",
      timestamp: "2026-06-24T10:15:00-07:00",
      user: "khakimi@gmail.com",
      action: "Approved Plan v1",
      risk: "Medium",
      status: "Approved",
      skillsExecuted: ["Vessel Planning", "Quay Crane Allocation", "Yard Planning", "Risk Assessment", "Decision Support"],
      details: "5 Quay Cranes allocated, yard capacity stable."
    },
    {
      id: "TX-9021",
      vessel: "CMA CGM Blue Marlin v01",
      timestamp: "2026-06-24T08:45:00-07:00",
      user: "khakimi@gmail.com",
      action: "Rejected Plan v1",
      risk: "High",
      status: "Rejected",
      skillsExecuted: ["Vessel Planning", "Quay Crane Allocation", "Yard Planning", "Risk Assessment", "Decision Support"],
      details: "Rejected due to critical restow conflicts on hatch 3."
    }
  ]);

  // Diagnostics connection status state
  const [diagnostics, setDiagnostics] = useState<{
    apiKeyConfigured: boolean;
    apiKeyLength: number;
    apiKeyPreview: string;
    pingStatus: 'success' | 'failed' | 'warning' | 'unchecked' | 'testing';
    responsePreview?: string;
    error?: string;
    message?: string;
  } | null>(null);
  const [checkingDiagnostics, setCheckingDiagnostics] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Default operational estimates (pre-calculated or live-updated on input change to showcase real-time planning preview)
  const totalMoves = inputs.dischargeCount + inputs.loadCount;
  const theoreticalDuration = totalMoves > 0 && inputs.cranesCount > 0 && inputs.craneProductivity > 0 
    ? (totalMoves / (inputs.cranesCount * inputs.craneProductivity)) 
    : 0;
  
  // Adjusted estimate factor based on congestion & priority
  const congestionFactor = inputs.congestion === 'High' ? 1.25 : inputs.congestion === 'Medium' ? 1.08 : 1.0;
  const priorityFactor = inputs.priority === 'Critical' ? 0.95 : inputs.priority === 'Urgent' ? 0.98 : 1.0;
  const calculatedLiveDuration = Math.round(theoreticalDuration * congestionFactor * priorityFactor * 10) / 10;

  // Triage classifications and parameters
  const getTriageTier = () => {
    if (inputs.congestion === 'High' || inputs.priority === 'Critical') {
      return {
        level: 'High-risk: manager approval required',
        color: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        iconColor: 'text-rose-400',
        desc: 'This plan carries significant operational friction. Senior manager authorization is mandatory to execute.'
      };
    }
    if (inputs.congestion === 'Medium' || inputs.priority === 'Urgent' || inputs.cranesCount < 3) {
      return {
        level: 'Needs planner review',
        color: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        iconColor: 'text-amber-400',
        desc: 'Moderate coordination required. Review cranes, yard stacking block allocations, and gate congestion indices.'
      };
    }
    return {
      level: 'Auto-acceptable',
      color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      iconColor: 'text-emerald-400',
      desc: 'Operational parameters are safe and stable. Suitable for immediate direct stowing workflow.'
    };
  };

  const triage = getTriageTier();
  const isMediumOrHighRisk = inputs.congestion === 'High' || inputs.congestion === 'Medium' || inputs.priority === 'Critical' || inputs.priority === 'Urgent' || inputs.cranesCount < 3;

  const handleTriageAction = (status: 'Approved' | 'Rejected' | 'Revision Requested', comments = "") => {
    setDecisionStatus(status);
    if (status === 'Revision Requested') {
      setShowRevisionInput(true);
    } else {
      setShowRevisionInput(false);
      // Log in audit trail
      const newAudit = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        vessel: inputs.vesselName,
        timestamp: new Date().toISOString(),
        user: "khakimi@gmail.com",
        action: `Planner ${status}`,
        risk: planResult?.safetyIndex && planResult.safetyIndex < 60 ? 'High' as const : planResult?.safetyIndex && planResult.safetyIndex < 80 ? 'Medium' as const : 'Low' as const,
        status: status,
        skillsExecuted: ["Vessel Planning", "Quay Crane Allocation", "Yard Planning", "Risk Assessment", "Decision Support"],
        details: `${status} by Terminal Planner khakimi@gmail.com. Comments: ${comments || "Standard decision signature"}`
      };
      setAuditTrail(prev => [newAudit, ...prev]);
    }
  };

  const submitRevision = () => {
    if (!revisionNotes.trim()) return;
    generateOperationalPlan(false, false, true, revisionNotes);
    setDecisionStatus('Revision Requested');
    setShowRevisionInput(false);
    setRevisionNotes('');
  };

  // Terminal Interactive Hotspots (Overlay on Container Terminal Reference graphic)
  const terminalHotspots = [
    {
      id: "quay-cranes",
      title: "Quay Cranes & Berth Zone",
      desc: "Super-Post-Panamax cranes. Allocated based on vessel hatch distribution, crane clearance boundaries, and draft constraints.",
      x: "25%",
      y: "40%",
    },
    {
      id: "vessel-stowage",
      title: "Vessel Carrier Deck",
      desc: "Double-stack bays. Planners balance discharge list priorities with mechanical lashing setups and vessel ballast profiles.",
      x: "48%",
      y: "35%",
    },
    {
      id: "yard-stacks",
      title: "Stacking Yard Blocks",
      desc: "Allocated blocks based on yard crane availability. Medium to High congestion triggers shuffle moves & extended cycle times.",
      x: "72%",
      y: "65%",
    },
    {
      id: "truck-gate",
      title: "Terminal Chassis & Gate Transport",
      desc: "Internal trucks route containers from quay to yard blocks. High congestion slows delivery intervals.",
      x: "35%",
      y: "80%",
    }
  ];

  // Health Check connectivity diagnostics function
  const runHealthCheck = async () => {
    setCheckingDiagnostics(true);
    try {
      const response = await fetch('/api/diagnostics');
      if (!response.ok) {
        throw new Error(`Diagnostics returned server code ${response.status}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setDiagnostics({
        apiKeyConfigured: false,
        apiKeyLength: 0,
        apiKeyPreview: "Unknown",
        pingStatus: 'failed',
        error: err.message || "Failed to contact diagnostic API endpoint."
      });
    } finally {
      setCheckingDiagnostics(false);
    }
  };

  // Run health check and diagnostics on load
  useEffect(() => {
    runHealthCheck();
  }, []);

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setInputs(preset);
  };

  const generateOperationalPlan = async (isInitial = false, allowFallback = false, isRevisionRequest = false, revisionComments = "") => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    
    const prevPlan = planResult;
    const prevInputs = { ...inputs };

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...inputs, allowFallback }),
      });

      if (!response.ok) {
        let title = "Stowage Calculation Failure";
        let detail = `Server responded with status code ${response.status}`;
        try {
          const errData = await response.json();
          title = errData.error || title;
          detail = errData.details || detail;
        } catch (e) {}
        throw { message: title, details: detail };
      }

      const data = await response.json();
      setPlanResult(data);

      if (isRevisionRequest && prevPlan) {
        const nextVersion = currentVersion + 1;
        setCurrentVersion(nextVersion);
        setDecisionStatus('Pending Review');

        const newRevision = {
          versionFrom: currentVersion,
          versionTo: nextVersion,
          timestamp: new Date().toLocaleTimeString(),
          notes: revisionComments || "Manual operational parameter adjustment.",
          diff: {
            durationFrom: prevPlan.estimatedDuration,
            durationTo: data.estimatedDuration,
            cranesFrom: prevInputs.cranesCount,
            cranesTo: inputs.cranesCount,
            congestionFrom: prevInputs.congestion,
            congestionTo: inputs.congestion,
            safetyFrom: prevPlan.safetyIndex,
            safetyTo: data.safetyIndex,
          }
        };
        setRevisionHistory(prev => [newRevision, ...prev]);

        const newAudit = {
          id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
          vessel: inputs.vesselName,
          timestamp: new Date().toISOString(),
          user: "khakimi@gmail.com",
          action: `Generated Revision v${nextVersion}`,
          risk: data.safetyIndex < 60 ? 'High' as const : data.safetyIndex < 80 ? 'Medium' as const : 'Low' as const,
          status: 'Pending' as const,
          skillsExecuted: ["Vessel Planning", "Quay Crane Allocation", "Yard Planning", "Risk Assessment", "Decision Support"],
          details: `Revised from v${currentVersion}. Planner Notes: ${revisionComments || "Inputs modified"}`
        };
        setAuditTrail(prev => [newAudit, ...prev]);
      } else {
        setCurrentVersion(1);
        setRevisionHistory([]);
        setDecisionStatus('Pending Review');

        const newAudit = {
          id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
          vessel: inputs.vesselName,
          timestamp: new Date().toISOString(),
          user: "khakimi@gmail.com",
          action: "Generated Plan v1",
          risk: data.safetyIndex < 60 ? 'High' as const : data.safetyIndex < 80 ? 'Medium' as const : 'Low' as const,
          status: 'Pending' as const,
          skillsExecuted: ["Vessel Planning", "Quay Crane Allocation", "Yard Planning", "Risk Assessment", "Decision Support"],
          details: `Initial operational stowage run for ${inputs.vesselName}.`
        };
        setAuditTrail(prev => [newAudit, ...prev]);
      }
    } catch (err: any) {
      console.error("Error generating operational plan:", err);
      setError(err?.message || "Unable to process AI-Optimized Plan. Please check connection and try again.");
      setErrorDetails(err?.details || "Failed to establish a reliable server-side connection to `/api/generate-plan`. Please verify your network and port bindings are healthy.");
    } finally {
      setLoading(false);
    }
  };

  const copySummaryText = () => {
    if (!planResult) return;
    const txt = `CONTAINER TERMINAL OPS REPORT - ${inputs.vesselName.toUpperCase()}
--------------------------------------------------
ESTIMATED OPERATION DURATION: ${planResult.estimatedDuration} hrs
CRANES ALLOCATED: ${planResult.quayCraneAllocation.map(q => `${q.craneId} (${q.assignmentDetails})`).join(', ')}
DECISION SUPPORT GUIDANCE: ${planResult.decisionSupportRecommendation}
--------------------------------------------------
PORT TERMINAL AUTOMATION PLANNER DECISION-SUPPORT REPORT`;
    
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Port Disclaimer Header */}
      <Header />

      {/* Main Work Area */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Top Operational Status Bar */}
        <div id="quick-presets" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Interactive Planning Presets
            </h2>
            <p className="text-xs text-slate-500">
              Instantly seed the planner with custom real-world port situations & crane constraints.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            {PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => selectPreset(preset)}
                className={`text-xs px-3 py-2 rounded-xl transition-all duration-200 border text-left ${
                  inputs.vesselName === preset.vesselName 
                    ? "bg-sky-500/10 border-sky-450 text-sky-350 font-medium" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {preset.name}
              </button>
            ))}

            <button
              onClick={() => {
                setDiagnosticsOpen(!diagnosticsOpen);
                if (!diagnostics) runHealthCheck();
              }}
              className={`text-xs px-3.5 py-2 rounded-xl transition-all duration-200 border flex items-center gap-2 ${
                diagnosticsOpen
                  ? "bg-sky-500/10 border-sky-400/50 text-sky-300 font-semibold"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${checkingDiagnostics ? "animate-spin text-sky-450" : "text-sky-400"}`} />
              <span>Diagnostic Center</span>
              {diagnostics && (
                <span className={`w-2 h-2 rounded-full ${
                  diagnostics.pingStatus === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Diagnostics Panel */}
        {diagnosticsOpen && (
          <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-5 space-y-4 shadow-inner max-w-7xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Container Host Diagnostic Status</h3>
                  <p className="text-[11px] text-slate-500">Verify client environment connectivity, API configuration, and Gemini ping states.</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                diagnostics?.pingStatus === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : diagnostics?.pingStatus === 'testing' || checkingDiagnostics
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                STATUS: {checkingDiagnostics ? "TESTING" : (diagnostics?.pingStatus || "UNCHECKED").toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <Database className="w-3.5 h-3.5 text-sky-400" />
                  <span>GEMINI_API_KEY Configured</span>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono text-sm">
                  {diagnostics?.apiKeyConfigured ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                      <span className="text-slate-500 text-xs text-[11px]">({diagnostics.apiKeyPreview})</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-red-400 font-bold">MISSING</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  The API key is accessed from the container environment securely to protect your credentials.
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                  <span>Gemini API Live Connection</span>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono text-sm">
                  {diagnostics?.pingStatus === 'success' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-450 font-bold">CONNECTED</span>
                    </>
                  ) : checkingDiagnostics || diagnostics?.pingStatus === 'testing' ? (
                    <>
                      <Activity className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                      <span className="text-amber-400 font-semibold animate-pulse">PINGING API...</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-red-400 font-bold">DISCONNECTED</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Pings the Gemini model lightweight end-point to confirm the credentials can authenticate properly.
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <Anchor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Interactive Playground Mode</span>
                </div>
                <div className="flex items-baseline gap-1.5 font-mono text-sm">
                  <span className="text-white font-bold">FULL-STACK APP</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Custom Express.js engine acting as an secure proxy. Avoids exposing raw tokens to client browers.
                </p>
              </div>
            </div>

            {diagnostics?.error && (
              <div className="bg-red-500/5 border border-red-900/30 rounded-xl p-4 text-xs text-red-200 font-mono space-y-1.5">
                <span className="text-red-400 font-bold block uppercase text-[10px]">Failed connection diagnostic reason:</span>
                <p className="text-[11px] text-red-300 leading-relaxed whitespace-pre-wrap">{diagnostics.error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 font-mono pt-1.5 border-t border-slate-950">
              <span>Diagnostics Check Timestamp: {diagnostics ? new Date().toISOString() : "None"}</span>
              <button 
                onClick={runHealthCheck}
                disabled={checkingDiagnostics}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors font-semibold flex items-center gap-1.5 disabled:opacity-50 text-[11px]"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${checkingDiagnostics ? "animate-spin" : ""}`} />
                {checkingDiagnostics ? "Running Test Ping..." : "Run Connection Test"}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Twin Panel: Form Input vs Interactive Digital Twin Image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Structural Inputs Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Ship className="w-5 h-5 text-sky-400" />
                <h2 className="font-display font-medium text-lg text-white">Vessel & Stowage Inputs</h2>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                PORT_OPS_v2
              </span>
            </div>

            <div className="space-y-4">
              {/* Vessel Name input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Vessel Identification String</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">ID:</span>
                  <input
                    type="text"
                    value={inputs.vesselName}
                    onChange={(e) => setInputs({ ...inputs, vesselName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                    placeholder="e.g. Antwerp Trader v14"
                  />
                </div>
              </div>

              {/* Grid: Discharge & Load Movements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Discharge Moves (TEUs)</label>
                  <input
                    type="number"
                    min="0"
                    value={inputs.dischargeCount}
                    onChange={(e) => setInputs({ ...inputs, dischargeCount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors font-mono"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono">▲ Import Stowage</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Load Moves (TEUs)</label>
                  <input
                    type="number"
                    min="0"
                    value={inputs.loadCount}
                    onChange={(e) => setInputs({ ...inputs, loadCount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors font-mono"
                  />
                  <span className="text-[10px] text-sky-400 font-mono">▼ Export Loading</span>
                </div>
              </div>

              {/* Grid: Cranes Count & Hourly Crane moves */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Quay Cranes Assigned</label>
                  <select
                    value={inputs.cranesCount}
                    onChange={(e) => setInputs({ ...inputs, cranesCount: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} Quay Cranes</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Move Efficiency (Moves/QC/h)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      max="50"
                      value={inputs.craneProductivity}
                      onChange={(e) => setInputs({ ...inputs, craneProductivity: parseInt(e.target.value) || 20 })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">/hr</span>
                  </div>
                </div>
              </div>

              {/* Grid: Congestion & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Yard Congestion</label>
                  <select
                    value={inputs.congestion}
                    onChange={(e) => setInputs({ ...inputs, congestion: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  >
                    <option value="Low">Low (Fast Shuffle)</option>
                    <option value="Medium">Medium (Standard)</option>
                    <option value="High">High (Terminal Choke)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Priority Class</label>
                  <select
                    value={inputs.priority}
                    onChange={(e) => setInputs({ ...inputs, priority: e.target.value as any })}
                    className={`w-full bg-slate-950 border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 transition-colors ${
                      inputs.priority === 'Critical' 
                        ? 'text-red-400 border-red-500/55 focus:ring-red-500' 
                        : inputs.priority === 'Urgent' 
                        ? 'text-amber-400 border-amber-500/55 focus:ring-amber-500' 
                        : 'text-sky-350 border-slate-800 focus:ring-sky-500'
                    }`}
                  >
                    <option value="Normal">Normal Route</option>
                    <option value="Urgent">Urgent Delivery</option>
                    <option value="Critical">Critical Demurrage</option>
                  </select>
                </div>
              </div>

              {/* Special Constraints Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Operational Constraints & Special Cargo Cargo Notes</label>
                <textarea
                  value={inputs.notes}
                  onChange={(e) => setInputs({ ...inputs, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="e.g. Hazardous class items, reefer block priority, specific stacking crane down for overhaul..."
                />
              </div>

              {/* Instant math indicators */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Movements Sum:</span>
                  <span className="font-mono font-semibold text-white">{totalMoves} TEUs</span>
                </div>
                <div className="flex justify-between">
                  <span>Combined Berth Output:</span>
                  <span className="font-mono text-sky-400">{inputs.cranesCount * inputs.craneProductivity} moves/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Theoretical Base Duration:</span>
                  <span className="font-mono">{Math.round(theoreticalDuration * 10) / 10} hrs</span>
                </div>
                <div className="flex justify-between text-slate-300 font-semibold border-t border-slate-900 pt-1.5 mt-1.5">
                  <span>Congestion-Adjusted estimate:</span>
                  <span className="text-amber-400 font-mono">~{calculatedLiveDuration} hrs</span>
                </div>
              </div>

              {/* Submit planning action button */}
              <button
                onClick={() => generateOperationalPlan(false)}
                disabled={loading || totalMoves === 0}
                className="w-full py-3 px-4 rounded-xl font-display font-medium text-sm transition-all text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 shadow-md shadow-sky-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Generate Operational Plan
              </button>
            </div>
          </div>

          {/* RIGHT: Visual Terminal Reference Image with interactive hotspots */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full lg:min-h-[580px]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-400 font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 animate-spin" /> Operational Reference Diagram
                </span>
                <h3 className="font-display font-medium text-white">Interactive Port Terminal Layout</h3>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-850">
                ACTIVE DIGITAL TWIN
              </span>
            </div>

            {/* Container Terminal background image with interactive overlays */}
            <div className="relative flex-grow bg-slate-950 flex items-center justify-center overflow-hidden min-h-[300px]">
              <img
                src={terminalImage}
                alt="Container Terminal Yard Landscape"
                className="w-full h-full object-cover opacity-85 transition-opacity duration-300 select-none pointer-events-none"
              />
              
              {/* Overlay Dark vignette to enhance HUD styling text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none"></div>

              {/* Hotspots layer */}
              {terminalHotspots.map((hotspot) => (
                <div
                  key={hotspot.id}
                  style={{ left: hotspot.x, top: hotspot.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                >
                  <button
                    onClick={() => setActiveHotspot(activeHotspot === hotspot.id ? null : hotspot.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg border relative ${
                      activeHotspot === hotspot.id 
                        ? "bg-teal-400 border-white text-slate-950 scale-125" 
                        : "bg-sky-500/90 border-sky-400/50 text-white hover:bg-sky-400"
                    }`}
                  >
                    <span className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping pointer-events-none"></span>
                    <Layers className="w-3.5 h-3.5" />
                  </button>

                  {/* Hotspot Hover Card */}
                  <div className={`absolute bottom-9 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-900/95 border border-slate-750 rounded-xl shadow-2xl backdrop-blur-md text-xs transition-opacity duration-200 pointer-events-none z-35 ${
                    activeHotspot === hotspot.id ? "opacity-100 scale-100" : "opacity-0 scale-95 uppercase group-hover:opacity-100"
                  }`}>
                    <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5 text-sky-300">
                      <Anchor className="w-3.5 h-3.5" />
                      {hotspot.title}
                    </h4>
                    <p className="text-slate-350 leading-relaxed font-sans normal-case">
                      {hotspot.desc}
                    </p>
                  </div>
                </div>
              ))}

              {/* Bottom HUD info indicator overlay */}
              <div className="absolute bottom-3 left-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span className="text-slate-300">Click terminal hotspot markers to explore key yard zone guidelines.</span>
                </div>
                <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono">BAYS STATUS: ONLINE</span>
              </div>
            </div>

            {/* Quick Informational stats beneath the graphics */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Discharge Load Ratio</span>
                <span className="text-sm font-mono text-slate-200">
                  {Math.round((inputs.dischargeCount / (totalMoves || 1)) * 100)}% / {Math.round((inputs.loadCount / (totalMoves || 1)) * 100)}%
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Yard Crane Stacking Velocity</span>
                <span className="text-sm font-mono text-emerald-450">
                  {inputs.congestion === 'High' ? 'Suboptimal (Shuffle Heavy)' : inputs.congestion === 'Medium' ? 'Optimal (Chassis-ready)' : 'Excellent'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Assigned Lane Buffers</span>
                <span className="text-sm font-mono text-sky-350">
                  {inputs.cranesCount > 3 ? "Sector 4-B & 4-C" : "Sector 2-A"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* AI OUTPUT SECTION */}
        <div id="optimizer-results" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400 animate-bounce" />
                <h2 className="text-xl font-display font-medium text-white">Generated Tactical Planning Assessment</h2>
              </div>
              <p className="text-xs text-slate-400">
                Comprehensive stowage cycle allocations, predicted gate congestion bottlenecks, and crane risk scores.
              </p>
            </div>

            {planResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copySummaryText}
                  className="px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850 transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Planning Report
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Conditional Layout with Loading/Error/Results */}
          {loading ? (
            <DischargeLoader />
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center space-y-4 max-w-3xl mx-auto">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
              <div className="space-y-1.5">
                <h3 className="text-xl font-display text-white font-semibold">Stowage Calculation Failure</h3>
                <p className="text-sm text-slate-350 max-w-xl mx-auto font-medium">
                  {error}
                </p>
              </div>

              {/* Collapsible raw trace log for published deployment diagnostics */}
              {errorDetails && (
                <div className="bg-slate-950/90 border border-slate-850 rounded-xl p-4 text-left space-y-2 mt-3 block">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-red-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>GEMINI ERROR DEPLOYMENT TRACE</span>
                  </div>
                  <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">
                    {errorDetails}
                  </pre>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Tips: If getting a 503 error, the system is temporarily busy. If getting code 400 with missing key warnings, please check your secret environment settings.
                  </p>
                </div>
              )}

              {/* Grouped recovery actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button 
                  onClick={() => generateOperationalPlan(false, false)}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-xs text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-pulse relative" />
                  Retry Live Gemini AI
                </button>
                
                <button 
                  onClick={() => generateOperationalPlan(false, true)}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-850 text-xs text-white border border-slate-800 hover:border-slate-750 font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Use Offline Calculated Plan
                </button>

                <button 
                  onClick={() => {
                    setDiagnosticsOpen(true);
                    runHealthCheck();
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-950 hover:bg-slate-900 text-xs text-slate-400 border border-slate-900 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                  Verify API Credentials
                </button>
              </div>
            </div>
          ) : planResult ? (
            <div className="space-y-6">
                
                {/* Human-In-The-Loop Triage & Security Guardrails Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  
                  {/* Human-in-the-Loop Triage Panel (7 cols) */}
                  <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/[0.01] rounded-full -translate-y-4 translate-x-4"></div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-sky-400 animate-pulse" />
                          <div>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Human-in-the-Loop Triage</h3>
                            <p className="text-[11px] text-slate-500">Every AI operational proposal requires an explicit planner action.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-850">
                          PROTOTYPE v{currentVersion}.0
                        </span>
                      </div>

                      {/* Triage Tier Badge Indicator */}
                      <div className={`border p-4 rounded-xl space-y-2 ${triage.color}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Proposal Classification</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${triage.badge}`}>
                            {triage.level.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-200">
                          {triage.desc}
                        </p>
                      </div>

                      {/* Current decision status message */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Current Planner Decision Status:</span>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          {decisionStatus === 'Approved' ? (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED BY PLANNER
                            </span>
                          ) : decisionStatus === 'Rejected' ? (
                            <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5" /> REJECTED BY PLANNER
                            </span>
                          ) : decisionStatus === 'Revision Requested' ? (
                            <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> REVISION IN PROGRESS
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> PENDING PLANNER ACTION
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Revision Input (Shown inline) */}
                      {showRevisionInput && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <label className="text-[11px] font-semibold text-slate-300 block uppercase tracking-wide">Enter Revision Instructions</label>
                          <textarea
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                            placeholder="e.g. Please assign at least 4 Quay Cranes to improve stowage velocity, or schedule direct trucks."
                          />
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <button
                              onClick={() => setShowRevisionInput(false)}
                              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={submitRevision}
                              disabled={!revisionNotes.trim() || loading}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                            >
                              {loading ? (
                                <Activity className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Submit Revision Request
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons list */}
                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap gap-2.5">
                      <button
                        onClick={() => handleTriageAction('Approved')}
                        disabled={decisionStatus === 'Approved' || loading}
                        className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          decisionStatus === 'Approved' 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 hover:border-emerald-500 shadow-sm active:scale-95'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Approve Plan
                      </button>

                      <button
                        onClick={() => handleTriageAction('Revision Requested')}
                        disabled={loading}
                        className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          decisionStatus === 'Revision Requested' || showRevisionInput
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 active:scale-95'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4 shrink-0" />
                        Request Revision
                      </button>

                      <button
                        onClick={() => handleTriageAction('Rejected')}
                        disabled={decisionStatus === 'Rejected' || loading}
                        className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          decisionStatus === 'Rejected' 
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                            : 'bg-slate-950 hover:bg-rose-950/20 text-slate-300 hover:text-rose-400 border-slate-800 hover:border-rose-900/40 active:scale-95'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        Reject Plan
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 italic leading-relaxed mt-3 pt-2.5 border-t border-slate-800/40">
                      ℹ️ <strong>Decision Support Prototype Notice:</strong> The Multi-Skill AI System is a decision-support prototype and NOT an autonomous operational control system. All recommended allocations and turnaround predictions must be reviewed, calibrated, and authorized by certified Terminal Planners or Duty Managers before actual execution.
                    </p>
                  </div>

                  {/* Trust & Safety Guardrails (5 cols) */}
                  <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-400" />
                          <div>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Trust & Safety Guardrails</h3>
                            <p className="text-[11px] text-slate-500">Active policy enforcement, constraint checking, and warning triggers.</p>
                          </div>
                        </div>
                      </div>

                      {/* Advisory notice */}
                      <div className="p-3 bg-slate-950/80 border-l-2 border-emerald-500 rounded-r-xl text-[11px] text-slate-350 leading-relaxed font-sans">
                        <strong>⚠️ SECURE AI GUARDRAIL:</strong> Recommendations generated by the AI agent are purely advisory. All final operational commands must be authorized by a certified Terminal Planner or Duty Manager.
                      </div>

                      {/* Risk review indicator */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-850">
                        <span className="text-xs text-slate-400">Risk Assessment Indicator:</span>
                        {isMediumOrHighRisk ? (
                          <span className="text-[10px] px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold font-mono">
                            ⚠️ HUMAN REVIEW REQUIRED
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold font-mono">
                            ✅ SYSTEM APPROVED DIRECT REVIEW
                          </span>
                        )}
                      </div>

                      {/* Dynamic Situational Warnings */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider block">Real-time Warning Indicators:</span>
                        
                        <div className="space-y-1.5">
                          {inputs.congestion === 'High' && (
                            <div className="bg-rose-500/5 border border-rose-950/30 px-3 py-2 rounded-lg flex items-start gap-2 text-[11px] text-rose-350">
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <span><strong>High Congestion Alert:</strong> Yard blocks are currently choked. Containers may experience major shuffle and positioning delays.</span>
                            </div>
                          )}

                          {inputs.cranesCount < 3 && (
                            <div className="bg-amber-500/5 border border-amber-950/30 px-3 py-2 rounded-lg flex items-start gap-2 text-[11px] text-amber-350">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span><strong>Insufficient Cranes:</strong> Fewer than 3 cranes are allocated for a major operation, extending berth occupancy.</span>
                            </div>
                          )}

                          {inputs.priority === 'Critical' && (
                            <div className="bg-rose-500/5 border border-rose-950/30 px-3 py-2 rounded-lg flex items-start gap-2 text-[11px] text-rose-350">
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <span><strong>Critical Priority Task:</strong> This vessel has demurrages or special handling demands. Interference with adjacent berths likely.</span>
                            </div>
                          )}

                          {(!inputs.notes || inputs.notes.trim().length < 15) && (
                            <div className="bg-amber-500/5 border border-amber-950/30 px-3 py-2 rounded-lg flex items-start gap-2 text-[11px] text-amber-350">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span><strong>Incomplete Constraint Notes:</strong> Constraint notes are empty or brief. Missing bay, reefers, or hazardous cargo specifications.</span>
                            </div>
                          )}

                          {inputs.congestion !== 'High' && inputs.cranesCount >= 3 && inputs.priority !== 'Critical' && inputs.notes && inputs.notes.trim().length >= 15 && (
                            <div className="bg-emerald-500/5 border border-emerald-950/30 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] text-emerald-350">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>All situational safety parameters reside inside stable limits.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Vibe Diff Concept - Plan Revision Summary (Visible when revisions exist) */}
                {revisionHistory.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-amber-400" />
                        <div>
                          <h3 className="text-sm font-semibold text-white tracking-wide">Plan Revision Summary (Vibe Diff Concept)</h3>
                          <p className="text-[11px] text-slate-500">Compare what changed between the initial AI plan and revised terminal models.</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                        {revisionHistory.length} REVISION(S) STORED
                      </span>
                    </div>

                    <div className="space-y-4">
                      {revisionHistory.map((rev, idx) => {
                        const durationDiff = Math.round((rev.diff.durationTo - rev.diff.durationFrom) * 10) / 10;
                        const cranesDiff = rev.diff.cranesTo - rev.diff.cranesFrom;
                        const safetyDiff = rev.diff.safetyTo - rev.diff.safetyFrom;

                        return (
                          <div key={idx} className="bg-slate-950 rounded-xl border border-slate-850 p-4 space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                              <span className="text-xs font-mono font-bold text-amber-400">
                                Revision #{rev.versionTo} (v{rev.versionFrom} → v{rev.versionTo})
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">Timestamp: {rev.timestamp}</span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/50 p-2.5 rounded border border-slate-900">
                              <strong>Planner Instruction:</strong> "{rev.notes}"
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                              <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-900">
                                <span className="text-[9px] text-slate-550 block uppercase font-bold tracking-wider">Turnaround Time</span>
                                <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                                  {rev.diff.durationFrom}h → {rev.diff.durationTo}h
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${durationDiff < 0 ? 'text-emerald-400' : durationDiff > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {durationDiff < 0 ? `Reduced by ${Math.abs(durationDiff)}h` : durationDiff > 0 ? `Increased by ${durationDiff}h` : 'No Change'}
                                </span>
                              </div>

                              <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-900">
                                <span className="text-[9px] text-slate-550 block uppercase font-bold tracking-wider">Quay Cranes</span>
                                <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                                  {rev.diff.cranesFrom} QCs → {rev.diff.cranesTo} QCs
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${cranesDiff > 0 ? 'text-emerald-400' : cranesDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {cranesDiff > 0 ? `Added ${cranesDiff} QC` : cranesDiff < 0 ? `Removed ${Math.abs(cranesDiff)} QC` : 'No Change'}
                                </span>
                              </div>

                              <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-900">
                                <span className="text-[9px] text-slate-550 block uppercase font-bold tracking-wider">Yard Congestion</span>
                                <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                                  {rev.diff.congestionFrom} → {rev.diff.congestionTo}
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${rev.diff.congestionFrom !== rev.diff.congestionTo ? 'text-sky-350' : 'text-slate-400'}`}>
                                  {rev.diff.congestionFrom !== rev.diff.congestionTo ? 'Yard state updated' : 'No Change'}
                                </span>
                              </div>

                              <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-900">
                                <span className="text-[9px] text-slate-550 block uppercase font-bold tracking-wider">Stability Cushion</span>
                                <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                                  {rev.diff.safetyFrom}% → {rev.diff.safetyTo}%
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${safetyDiff > 0 ? 'text-emerald-400' : safetyDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {safetyDiff > 0 ? `Improved +${safetyDiff}%` : safetyDiff < 0 ? `Dropped ${safetyDiff}%` : 'No Change'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic Port Metrics Summary Header */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between animate-fade-in">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Est. Duration</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-mono font-bold text-sky-400">{planResult.estimatedDuration}</span>
                      <span className="text-[10px] text-slate-500">hrs</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Assigned QCs</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-mono font-bold text-white">{inputs.cranesCount}</span>
                      <span className="text-[10px] text-slate-500 font-medium text-slate-400">cranes</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Post-Ops Congestion</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-xl font-mono font-bold ${planResult.congestionIndex > 75 ? 'text-rose-400' : planResult.congestionIndex > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {planResult.congestionIndex}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Stability Index</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-mono font-bold text-teal-400">{planResult.safetyIndex}%</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl col-span-2 lg:col-span-1 p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Priority Rank</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${inputs.priority === 'Critical' ? 'bg-rose-500 animate-pulse' : 'bg-sky-400'}`}></span>
                      <span className="text-xs font-mono font-bold text-slate-200">{inputs.priority}</span>
                    </div>
                  </div>
                </div>

              {/* Subtabs to navigate dynamic Multi-Skill sections */}
              <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {[
                  { id: 'all', label: 'All Skills Dashboard', icon: Sparkles },
                  { id: 'vessel', label: '1. Vessel Planning', icon: Ship },
                  { id: 'cranes', label: '2. Crane Allocation', icon: Anchor },
                  { id: 'yard', label: '3. Yard Planning', icon: Layers },
                  { id: 'risks', label: '4. Risk Assessment', icon: AlertTriangle },
                  { id: 'decision', label: '5. Decision Support', icon: Compass }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                        activeTab === tab.id 
                          ? "border-sky-500 text-sky-400 bg-sky-500/5 font-bold" 
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Multi-Skill Output Sections */}
              <div className="space-y-6">

                {/* 1. VESSEL PLANNING SKILL CONTROLLER */}
                {(activeTab === 'all' || activeTab === 'vessel') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-750">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/[0.015] rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Skill Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                          <Ship className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-semibold border border-sky-500/10">SKILL 01</span>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Vessel Planning Skill</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Analyse vessel workload distribution and estimate operation turnaround cycles.</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-right shrink-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Calculated Turnaround</span>
                        <span className="text-xs font-mono font-bold text-sky-400">{planResult.estimatedDuration} Hrs Total</span>
                      </div>
                    </div>

                    {/* Skill Core Workspace */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Vessel Load Breakdown & Data */}
                      <div className="md:col-span-7 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Workload Scenario Profile</h4>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                            <div className="space-y-1">
                              <span className="text-slate-500 text-[11px]">Vessel Name</span>
                              <span className="text-slate-200 block truncate font-medium">{inputs.vesselName}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-500 text-[11px]">Priority Category</span>
                              <span className={`block font-bold ${inputs.priority === 'Critical' ? 'text-red-400 animate-pulse' : inputs.priority === 'Urgent' ? 'text-amber-400' : 'text-sky-400'}`}>{inputs.priority.toUpperCase()}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-500 text-[11px]">Discharge Count</span>
                              <span className="text-slate-200 block font-medium">{inputs.dischargeCount} TEUs</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-500 text-[11px]">Load Count</span>
                              <span className="text-slate-200 block font-medium">{inputs.loadCount} TEUs</span>
                            </div>
                          </div>

                          {/* Load vs Discharge Progress Bar Visualizer */}
                          <div className="pt-2">
                            <div className="flex justify-between text-[11px] font-mono mb-1">
                              <span className="text-sky-400 font-medium">Discharge ({Math.round(inputs.dischargeCount / (inputs.dischargeCount + inputs.loadCount || 1) * 100)}%)</span>
                              <span className="text-indigo-400 font-medium">Load ({Math.round(inputs.loadCount / (inputs.dischargeCount + inputs.loadCount || 1) * 100)}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                              <div style={{ width: `${(inputs.dischargeCount / (inputs.dischargeCount + inputs.loadCount || 1)) * 100}%` }} className="h-full bg-gradient-to-r from-sky-500 to-sky-450" />
                              <div style={{ width: `${(inputs.loadCount / (inputs.dischargeCount + inputs.loadCount || 1)) * 100}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-indigo-450" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Productivity & Density KPIs */}
                      <div className="md:col-span-12 lg:col-span-5 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 h-full flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Operations Density Index</h4>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-3xl font-mono font-bold text-white">
                                {((inputs.dischargeCount + inputs.loadCount) / planResult.estimatedDuration).toFixed(1)}
                              </span>
                              <span className="text-xs text-slate-455 font-mono">TEUs / hour</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-450 leading-normal">
                            Predicted net berth operations intensity. Computes the combined cargo density of {inputs.dischargeCount + inputs.loadCount} Total TEUs against the estimated {planResult.estimatedDuration} turnaround hours.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. QUAY CRANE ALLOCATION SKILL CONTROLLER */}
                {(activeTab === 'all' || activeTab === 'cranes') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-750">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.015] rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Skill Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                          <Anchor className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-505/10">SKILL 02</span>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Quay Crane Allocation Skill</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Recommend optimal berth crane placements and identify critical asset shortages.</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-right shrink-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Active Cranes Allocated</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{planResult.quayCraneAllocation.length} Deployable Units</span>
                      </div>
                    </div>

                    {/* Shortage & Scarcity Assessment Banner */}
                    <div className="mb-5">
                      {inputs.cranesCount < 3 ? (
                        <div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">CRITICAL CRANE RESOURCE SHORTAGE</h4>
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              Vessel operations are bottlenecked by raw crane capacity ({inputs.cranesCount} QCs assigned). With {inputs.dischargeCount + inputs.loadCount} total containers, terminal berth occupancy is severely extended. We strongly recommend allocating a minimum of 3 cranes to scale down cyclic turnaround times.
                            </p>
                          </div>
                        </div>
                      ) : inputs.craneProductivity < 25 ? (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                          <Info className="w-5 h-5 text-amber-450 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">EFFICIENCY COEFFICIENT ADV_LIMITATION</h4>
                            <p className="text-xs text-amber-200/90 leading-relaxed">
                              Crane productivity indices ({inputs.craneProductivity} gross moves/hour) are below optimal deep-sea hub baselines. Stagger gate chassis configurations to avoid crane-cycle starvation on the lashing panels.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-450 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-emerald-450 uppercase tracking-wider">QUAY RESOURCE BALANCED CAPACITY SECURE</h4>
                            <p className="text-xs text-slate-350 leading-relaxed">
                              Crane deployments are optimal for container cargo intensity. Assigned {inputs.cranesCount} QCs operating at {inputs.craneProductivity} gross moves/hour guarantees maximum hatch velocity with minimal structural interference.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Crane Assignments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {planResult.quayCraneAllocation.map((crane, idx) => (
                        <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-start gap-3 hover:border-slate-800 transition-colors">
                          <div className="bg-emerald-500/10 p-2.5 text-emerald-400 rounded-lg text-xs font-mono font-bold shrink-0">
                            {crane.craneId}
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <h5 className="font-semibold text-white text-xs">Work Segment Assignment</h5>
                            <p className="text-xs text-slate-400 leading-relaxed break-words">{crane.assignmentDetails}</p>
                            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-teal-400 font-mono">
                              <span className="w-1.5 h-1.5 bg-teal-450 rounded-full animate-pulse"></span>
                              Target Standard: {crane.productivityKPI}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* 3. YARD PLANNING SKILL CONTROLLER */}
                {(activeTab === 'all' || activeTab === 'yard') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-755">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.015] rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Skill Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-text-amber-400 rounded-xl">
                          <Layers className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-semibold border border-amber-500/10">SKILL 03</span>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Yard Planning Skill</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Evaluate post-operations yard stacking occupancy risk and structure block routing coordinates.</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-right shrink-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Post-Ops Storage Impact</span>
                        <span className="text-xs font-mono font-bold text-amber-400 text-amber-300">{inputs.congestion} Saturation</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Saturation progress bar detail */}
                      <div className="md:col-span-12 lg:col-span-5 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 flex flex-col justify-between h-full">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Estimated Post-Ops Gridlock Risk</h4>
                            
                            <div className="flex items-baseline justify-between mt-3">
                              <span className={`text-3xl font-mono font-bold ${planResult.congestionIndex > 75 ? 'text-red-400' : planResult.congestionIndex > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {planResult.congestionIndex}%
                              </span>
                              <span className="text-xs font-mono text-slate-505">Occupancy Forecast</span>
                            </div>

                            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mt-3 border border-slate-800">
                              <div 
                                style={{ width: `${planResult.congestionIndex}%` }} 
                                className={`h-full rounded-full ${
                                  planResult.congestionIndex > 75 
                                    ? 'bg-gradient-to-r from-red-500 to-rose-400' 
                                    : planResult.congestionIndex > 45 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                }`} 
                              />
                            </div>
                          </div>

                          <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-850 text-[11px] text-slate-400 leading-normal font-sans">
                            {planResult.congestionIndex > 75 ? (
                              <span className="text-red-300 font-medium">⚠️ BLOCKS CRITICAL GRIDLOCK WARNING: Severe terminal saturation forecast. Direct imports might experience extreme shuffle-move delays.</span>
                            ) : (
                              <span className="text-emerald-300 font-medium">✅ OPTIMAL ACCELERATION PATTERN: Yard retains generous buffers to safely maintain continuous shift vehicle rotations.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Strategic strategies list */}
                      <div className="md:col-span-12 lg:col-span-7 space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Suggest Yard Allocation Strategies</h4>
                          <div className="space-y-3">
                            {planResult.yardPlanningConsiderations.map((consideration, idx) => (
                              <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                                <p className="leading-relaxed">{consideration}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. RISK ASSESSMENT SKILL CONTROLLER */}
                {(activeTab === 'all' || activeTab === 'risks') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-750">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.015] rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Skill Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-semibold border border-red-505/10">SKILL 04</span>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Risk Assessment Skill</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Identify operational shipping risk vectors, evaluate quay interference, and assess logistics bottlenecks.</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-right shrink-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Terminal Cushion Factor</span>
                        <span className={`text-xs font-mono font-bold ${planResult.safetyIndex > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{planResult.safetyIndex}% Stability Index</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Bottlenecks */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block border-b border-slate-800 pb-2">PREDICTIVE TERMINAL BOTTLENECKS</span>
                        <div className="space-y-2 mt-2">
                          {planResult.operationalBottlenecks.map((b, idx) => (
                            <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 text-xs text-slate-300 flex items-start gap-2.5">
                              <span className="font-mono text-rose-500 font-bold text-[10px] bg-rose-500/10 px-1.5 py-0.2 rounded shrink-0">B{idx+1}</span>
                              <span className="leading-relaxed text-[11px] md:text-xs">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risks Vectors */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block border-b border-slate-800 pb-2">IDENTIFIED OPERATIONAL RISK VECTORS</span>
                        <div className="space-y-2 mt-2">
                          {planResult.riskAssessment.map((risk, idx) => (
                            <div key={idx} className="text-xs text-slate-400 flex items-start gap-2.5 p-1.5">
                              <span className="text-amber-500 mt-0.5 shrink-0 text-xs">⚠️</span>
                              <span className="leading-relaxed text-[11px] md:text-xs">{risk}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 5. DECISION SUPPORT SKILL CONTROLLER */}
                {(activeTab === 'all' || activeTab === 'decision') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-750 font-sans">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/[0.015] rounded-full -translate-y-8 translate-x-8"></div>
                    
                    {/* Skill Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                          <Compass className="w-5 h-5 text-sky-450" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-semibold border border-sky-505/10">SKILL 05</span>
                            <h3 className="text-sm font-semibold text-white tracking-wide">Decision Support Skill</h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Generate critical recommendations and produce an AI-synthesized executive summary.</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 text-right shrink-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-semibold">Stowage Approval Seal</span>
                        <span className="text-xs font-mono font-bold text-sky-400">TS-APPROVED-AI-77A</span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      
                      {/* Executive Operations Summary */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-855 space-y-3">
                        <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800 pb-2">
                          <FileText className="w-3.5 h-3.5" />
                          Executive Ops multi-skill summary
                        </h4>
                        <div id="narrative-summary" className="text-xs md:text-sm text-slate-350 leading-relaxed font-sans font-normal whitespace-pre-wrap">
                          {planResult.humanPlanningSummary}
                        </div>
                      </div>

                      {/* Decision Support Core Recommendation Highlight Banner */}
                      <div className="bg-gradient-to-r from-sky-950/80 via-slate-950 to-indigo-950/80 border border-sky-500/20 rounded-xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Compass className="w-4 h-4 text-sky-450 animate-spin" style={{ animationDuration: '6s' }} />
                            <h4 className="text-xs font-bold uppercase text-white tracking-wide">Decision-Support Core Directive</h4>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                            {planResult.decisionSupportRecommendation}
                          </p>
                        </div>
                        <div className="bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 shrink-0 self-end sm:self-auto font-mono text-center">
                          <span className="text-[9px] text-slate-500 uppercase block font-semibold">Reserve Buffer</span>
                          <span className={`text-xs font-bold ${planResult.safetyIndex > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{planResult.safetyIndex}% Safety Index</span>
                        </div>
                      </div>

                      {/* Tactical Action checklist */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <h4 className="text-xs font-semibold text-emerald-450 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Tactical Mitigation Commands Checklist
                        </h4>
                        <p className="text-xs text-slate-400">
                          Recommended overrides which terminal masters and harbor planners should execute today:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {planResult.suggestedMitigationActions.map((action, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg flex items-start gap-3 transition-colors hover:border-slate-700">
                              <span className="font-bold text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                                COMMAND {idx+1}
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed text-[11px] md:text-xs">
                                {action}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-slate-900/10 border border-slate-800/80 rounded-2xl p-10 text-center space-y-4 max-w-2xl mx-auto flex flex-col items-center justify-center">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-sky-400">
                <Sparkles className="w-7 h-7 text-sky-450 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-base font-semibold text-white">Stowage Optimizer Ready</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Specify your stowage moves, assigned Quay Cranes, and current congestion rates in the inputs panel, then click <strong className="text-sky-400 font-medium">Generate Operational Plan</strong> to build an AI-Optimized tactical assessment.
                </p>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer operations statistics */}
      <footer className="border-t border-slate-800 bg-slate-950 py-5 px-4 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p>© 2026 Container Terminal Planning Assistant. All rights reserved. Registered port ops prototype platform.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Port Telemetry Link</span>
            <span>API v3.55 (Active)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Inline helper components for clean presentation
function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="m9 18 6-6-6-6"/></svg>
  );
}
