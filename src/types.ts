export interface TerminalPlanningInput {
  vesselName: string;
  dischargeCount: number;
  loadCount: number;
  cranesCount: number;
  craneProductivity: number;
  congestion: 'Low' | 'Medium' | 'High';
  priority: 'Normal' | 'Urgent' | 'Critical';
  notes: string;
}

export interface CraneAllocation {
  craneId: string;
  assignmentDetails: string;
  productivityKPI: string;
}

export interface TerminalPlanningOutput {
  estimatedDuration: number; // in hours
  quayCraneAllocation: CraneAllocation[];
  yardPlanningConsiderations: string[];
  riskAssessment: string[];
  operationalBottlenecks: string[];
  suggestedMitigationActions: string[];
  humanPlanningSummary: string;
  decisionSupportRecommendation: string;
  safetyIndex: number; // 0 to 100
  congestionIndex: number; // 0 to 100
}
