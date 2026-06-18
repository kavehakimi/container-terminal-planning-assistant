import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const port = 3000;

// Initialize the Google Gemini GenAI SDK on the server side
// with telemetry headers configured. Always lazy-initialize or check API key.
const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Plans will be simulated.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || 'MOCK_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint for generating container terminal operational plans
  app.post('/api/generate-plan', async (req, res) => {
    try {
      const inputs = req.body;
      const {
        vesselName,
        dischargeCount,
        loadCount,
        cranesCount,
        craneProductivity,
        congestion,
        priority,
        notes,
        allowFallback,
      } = inputs;

      // Validate inputs
      if (!vesselName || dischargeCount === undefined || loadCount === undefined) {
        return res.status(400).json({ error: "Vessel Name, discharge count, and load count are required fields." });
      }

      const getFallbackPlan = () => {
        const cranes = Number(cranesCount) || 3;
        const prod = Number(craneProductivity) || 25;
        const cong = congestion || 'Medium';
        const prio = priority || 'Normal';
        const safeNotes = String(notes || "");

        const calculatedDuration = Math.round((dischargeCount + loadCount) / (cranes * prod) * (cong === 'High' ? 1.25 : cong === 'Medium' ? 1.1 : 1.0) * 10) / 10 || 4;
        const mockAllocations = Array.from({ length: Math.min(cranes, 6) }, (_, i) => ({
          craneId: `QC-${i + 1}`,
          assignmentDetails: i % 2 === 0 
            ? `Discharging forward hatch ${Math.min(i*2 + 1, 12)} to transfer trailers` 
            : `Loading export cells in aft hatch ${Math.min(i*2 + 2, 12)}`,
          productivityKPI: `${prod - (cong === 'High' ? 3 : 0)} gross moves/hr`,
        }));

        const isHazardous = safeNotes.toLowerCase().includes('imo') || safeNotes.toLowerCase().includes('class') || safeNotes.toLowerCase().includes('hazard');

        return {
          estimatedDuration: calculatedDuration,
          quayCraneAllocation: mockAllocations,
          yardPlanningConsiderations: [
            `Distribute import containers to yard block ${cong === 'High' ? 'C5-C6 (Extreme load)' : 'A1-A3'} to minimize RTG trolley congestion.`,
            "Optimize internal terminal chassis travel loops to avoid crossing lanes at critical berth hatch junctions.",
            `Ensure proper pre-stave allocations for outbound block trains scheduled during shift transition.`,
            isHazardous ? "Isolate IMO class reefers to designated active monitoring block G19." : "Regular monitoring of high-cube stows for wind stability indices."
          ],
          riskAssessment: [
            `Yard stack occupancy is currently elevated, which could trigger shuffle-moves during discharge of bottom-tiers.`,
            prio === 'Critical' ? "High priority vessel class may expect precedence; quay operators must coordinate dispatch." : "Standard harbor traffic queue delays predicted for evening gate hours.",
            cong === 'High' ? "Extreme congestion levels risk chassis gridlock if local customs clearance is delayed." : "Favorable meteorological conditions; no wind stowage restrictions expected."
          ],
          operationalBottlenecks: [
            "Quay crane trolley interference risk at adjacent hatches due to close lashing arrangements.",
            cong === 'High' ? "Anticipated stacking yard crane buffer congestion in Blocks C & D." : "Minor delays at safety check desk during terminal shift-handover."
          ],
          suggestedMitigationActions: [
            "Pre-stage empty terminal chassis backplanes to boost outbound velocity.",
            "Coordinate gate appointments to stagger heavy vehicle arrivals during high-volume discharge hours.",
            isHazardous ? "Establish immediate priority dispatch priority for dangerous cargo flatracks." : "Stagger quay operator lunch rotations to preserve continuous crane cycling."
          ],
          humanPlanningSummary: `**Operations Plan for ${vesselName} (Calculated Fallback Mode)**: Designed with priority level **${prio}** under **${cong}** yard congestion. Total of **${dischargeCount + loadCount}** container moves forecasted across **${cranes}** cranes. The operation is estimated to take approximately **${calculatedDuration} hours** assuming ${prod} gross moves per crane hour.`,
          decisionSupportRecommendation: `Immediately deploy ${Math.max(1, Math.min(cranes, 3))} cranes to hatch groups 4 and 6. Maximize night shifts to capitalize on diminished gate traffic.`,
          safetyIndex: prio === 'Critical' ? 95 : 82,
          congestionIndex: cong === 'High' ? 88 : cong === 'Medium' ? 58 : 22,
        };
      };

      const apiKey = process.env.GEMINI_API_KEY;
      
      // TEMPORARILY USE MOCK: Flag to bypass external API calls for resilient container deployment testing.
      const TEMPORARILY_USE_MOCK = false;
      if (TEMPORARILY_USE_MOCK) {
        console.log("TEMPORARY DIRECT MOCK OPTIMIZER ACTIVE: Bypassing external model calls for resilient testing.");
        const mockPlan = getFallbackPlan();
        return res.json({
          ...mockPlan,
          _engine: {
            status: "mock_test_mode",
            model: "Local Stowage Optimization Engine (Mock Active for Resilient Deployment Testing)",
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!apiKey) {
        // Fallback simulation for offline/missing key scenario so the app never crashes
        return res.json(getFallbackPlan());
      }

      try {
        const ai = getGenAI();

        const prompt = `
          You are an expert Container Terminal Operations Planner and Maritime Logistics Optimization Engine.
          Assess the following vessel docking and yard planning scenario and generate an operational decision-support report:
          
          - Vessel Name: ${vesselName}
          - Discharge Volume: ${dischargeCount} containers (TEUs)
          - Load Volume: ${loadCount} containers (TEUs)
          - Available Quay Cranes: ${cranesCount} cranes
          - Crane Productivity Rate: ${craneProductivity} gross moves/hour/crane
          - Current Yard Congestion: ${congestion}
          - Priority Class: ${priority}
          - Constraints & Cargo Specifics: ${notes || "None specified"}
          
          Please calculate accurate, professional-grade values for operational support.
          - Calculated Duration: Total moves (${dischargeCount} + ${loadCount}) divided by (Quay Cranes * Productivity), with adjustments for yard congestion (${congestion}) and priority interference (${priority}).
          - Complete Quay Crane assignments with designations for cranes QC-1, QC-2 up to QC-${cranesCount}.
          - Ensure recommendations and risks are deeply relevant to port operations (e.g. twistlock handling, hatch-cover sequences, yard block positioning, twin-lift possibilities, wind speeds, restows).
          
          This decision-support analysis must be strict, accurate, and structured.
        `;

        const generateParams = {
          contents: prompt,
          config: {
            systemInstruction: "You are the primary container terminal planning AI assistant. Help planners organize berth, crane, and yard operations. Return structured JSON recommendations following the precise schema provided.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                estimatedDuration: {
                  type: Type.NUMBER,
                  description: "Estimated total vessel operations duration in hours based on discharge/load volumes and crane productivity constraints."
                },
                quayCraneAllocation: {
                  type: Type.ARRAY,
                  description: "Specific Quay Crane (QC) allocation recommendations and expected KPIs.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      craneId: { type: Type.STRING, description: "Crane designation identifier (e.g. QC-1, QC-2)" },
                      assignmentDetails: { type: Type.STRING, description: "Description of cargo work segment or hatch responsibility assigned to this crane" },
                      productivityKPI: { type: Type.STRING, description: "Expected moves per hour or target efficiency for this crane" }
                    },
                    required: ["craneId", "assignmentDetails", "productivityKPI"]
                  }
                },
                yardPlanningConsiderations: {
                  type: Type.ARRAY,
                  description: "Yard planning strategic decisions, stack organization advice, buffer zone locations.",
                  items: { type: Type.STRING }
                },
                riskAssessment: {
                  type: Type.ARRAY,
                  description: "Critical risk items identified (traffic bottlenecking, weather, crane interference, priority stress).",
                  items: { type: Type.STRING }
                },
                operationalBottlenecks: {
                  type: Type.ARRAY,
                  description: "Specific structural bottlenecks anticipated (quay-side, yard-side, gate-side).",
                  items: { type: Type.STRING }
                },
                suggestedMitigationActions: {
                  type: Type.ARRAY,
                  description: "Concrete actions the terminal planner should take to alleviate bottleneck risks.",
                  items: { type: Type.STRING }
                },
                humanPlanningSummary: {
                  type: Type.STRING,
                  description: "A highly concise, professional, human-readable operational planning narrative summary in markdown format."
                },
                decisionSupportRecommendation: {
                  type: Type.STRING,
                  description: "Final actionable tactical guidance or recommendation overview for the terminal manager."
                },
                safetyIndex: {
                  type: Type.NUMBER,
                  description: "Calculated plan stability or risk cushion index (integer between 0 and 100)."
                },
                congestionIndex: {
                  type: Type.NUMBER,
                  description: "Estimated post-operations yard congestion impact index (integer between 0 and 100)."
                }
              },
              required: [
                "estimatedDuration",
                "quayCraneAllocation",
                "yardPlanningConsiderations",
                "riskAssessment",
                "operationalBottlenecks",
                "suggestedMitigationActions",
                "humanPlanningSummary",
                "decisionSupportRecommendation",
                "safetyIndex",
                "congestionIndex"
              ]
            }
          }
        };

        let response;
        try {
          console.log("Requesting container terminal planning from primary model: gemini-3.5-flash...");
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            ...generateParams
          });
        } catch (firstError: any) {
          console.warn("Primary model 'gemini-3.5-flash' unavailable or experience demand spikes. Retrying with 'gemini-3.1-flash-lite' fallback model...", firstError?.message || firstError);
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            ...generateParams
          });
          console.log("Successfully generated plan using 'gemini-3.1-flash-lite' fallback model.");
        }

        const responseText = response.text;
        if (!responseText) {
          throw new Error("No response text received from Gemini API");
        }

        const planData = JSON.parse(responseText.trim());
        res.json({
          ...planData,
          _engine: {
            status: "success",
            model: "gemini-3.5-flash",
            timestamp: new Date().toISOString()
          }
        });
      } catch (geminiError: any) {
        console.error("Gemini service is completely unavailable or returned malformed content:", geminiError);
        
        const apiErrorMsg = geminiError?.message || String(geminiError);
        const statusCode = geminiError?.status || geminiError?.statusCode || 503;

        if (allowFallback) {
          console.log("Allow fallback is enabled on request. Returning robust offline calculation.");
          res.json({
            ...getFallbackPlan(),
            _isFallback: true,
            _fallbackCause: apiErrorMsg,
            _engine: {
              status: "fallback",
              error: apiErrorMsg,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          // Send back status code and detailed message
          res.status(statusCode).json({
            error: "Gemini Service Failure",
            details: apiErrorMsg,
            code: statusCode,
            apiKeyPresent: !!process.env.GEMINI_API_KEY
          });
        }
      }
    } catch (error: any) {
      console.error("Critical fallback failed:", error);
      res.status(500).json({ 
        error: "Critical Server Error", 
        details: error?.message || "Internal server error occurred during plan generation." 
      });
    }
  });

  // Diagnostics endpoint to verify API key existence and perform test-ping calls
  app.get('/api/diagnostics', async (req, res) => {
    try {
      console.log("Health check and Gemini connectivity diagnostics requested...");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          apiKeyConfigured: false,
          apiKeyLength: 0,
          apiKeyPreview: "Not Configured",
          pingStatus: "failed",
          error: "Missing GEMINI_API_KEY environment variable. Please ensure it is defined in the Settings menu."
        });
      }

      // Safeguard length check and build mini preview
      const cleanKey = apiKey.trim();
      const preview = cleanKey.length > 8 
        ? `${cleanKey.substring(0, 4)}...${cleanKey.substring(cleanKey.length - 4)}`
        : "Invalid Key Length";

      try {
        const ai = getGenAI();
        console.log("Executing live lightweight test ping to Gemini API...");
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: "Say OK.",
          config: {
            maxOutputTokens: 6
          }
        });

        if (response.text) {
          res.json({
            apiKeyConfigured: true,
            apiKeyLength: cleanKey.length,
            apiKeyPreview: preview,
            pingStatus: "success",
            responsePreview: response.text.trim(),
            message: "Successfully connected to Gemini API!"
          });
        } else {
          res.json({
            apiKeyConfigured: true,
            apiKeyLength: cleanKey.length,
            apiKeyPreview: preview,
            pingStatus: "warning",
            responsePreview: "Empty response content",
            error: "Gemini answered but returned an empty response."
          });
        }
      } catch (pingError: any) {
        console.error("Gemini diagnostics live test failed:", pingError);
        res.json({
          apiKeyConfigured: true,
          apiKeyLength: cleanKey.length,
          apiKeyPreview: preview,
          pingStatus: "failed",
          error: pingError?.message || String(pingError),
          statusCode: pingError?.status || pingError?.statusCode || 500
        });
      }
    } catch (err: any) {
      console.error("API Diagnostics route exception:", err);
      res.status(500).json({
        error: "Diagnostics exception",
        details: err?.message || String(err)
      });
    }
  });

  // Serve static assets or use Vite in dev with a fallback mechanism
  const isProd = process.env.NODE_ENV === 'production' || 
                 (typeof __filename !== 'undefined' && __filename.includes('dist')) ||
                 fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

  if (!isProd) {
    try {
      console.log("Starting server in DEVELOPMENT mode with Vite integration...");
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn("Vite failed to load in dev mode, falling back to static production serve.", viteError);
      // Fallback: register production serve
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    console.log("Starting server in PRODUCTION mode with compiled assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Container Terminal Planning Assistant server listening at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to start backend server:", err);
});
