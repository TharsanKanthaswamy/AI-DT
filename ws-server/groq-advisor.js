import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

/**
 * Asks Groq to analyze an asset's current state and recommend
 * specific parameter corrections. Returns structured JSON.
 *
 * Called when ML probabilities exceed recovery thresholds.
 */
export async function getGroqRecoveryPlan(state, probabilities, triggeredRules) {
    if (!groq) {
        console.warn('[Groq] No API key configured — skipping AI recovery');
        return null;
    }

    const prompt = `
You are an autonomous industrial control system AI managing a smart 
assembly line. A risk has been detected and you must decide on corrective 
actions to protect the equipment and maintain production.

ASSET STATE:
- Asset ID: ${state.assetId}
- Asset Type: ${state.assetType} (Machine Type: ${state.machineType})
- Air Temperature: ${state.air_temp?.toFixed(1)} K (safe range: 295-308 K)
- Process Temperature: ${state.process_temp?.toFixed(1)} K (safe range: 305-314 K)
- Rotational Speed: ${state.rpm} RPM (safe range: 800-1800 RPM)
- Torque: ${state.torque?.toFixed(1)} Nm (safe range: 15-55 Nm)
- Tool Wear: ${state.tool_wear?.toFixed(0)} min (replace at 200+ min)
- Current UPH: ${state.uph ?? 'unknown'} units/hr
- Energy Draw: ${state.energy_kwh?.toFixed(3)} kWh
- Efficiency Score: ${((state.efficiency_score ?? 0) * 100).toFixed(0)}%

ML FAILURE PROBABILITIES:
${Object.entries(probabilities)
            .map(([k, v]) => `- ${k.toUpperCase()}: ${(v * 100).toFixed(1)}%`)
            .join('\n')}

TRIGGERED RISK RULES:
${triggeredRules.map(r => `- ${r.type}: ${(probabilities[r.probKey] * 100).toFixed(1)}% probability (threshold: ${r.triggerThreshold * 100}%)`).join('\n')}

TASK:
1. Briefly explain (2-3 sentences) what physical phenomenon is causing 
   this risk in plain English that a factory operator can understand.
2. State exactly what corrective actions you are taking and why.
3. Provide the specific parameter values you are setting.
4. Estimate the UPH impact of your intervention.

CRITICAL CONSTRAINT:
You must NEVER modify air_temp in your parameter_changes.
air_temp is an ambient environmental parameter — no machine actuator
can control the surrounding factory air temperature.
Only modify: process_temp, rpm, torque, tool_wear (reset tool_wear to 0 if the tool needs replacing).

Respond ONLY with this exact JSON structure, no other text:
{
  "diagnosis": "Plain English explanation of what is physically happening",
  "action_summary": "What the AI is doing to fix it",
  "reasoning": "Why these specific parameter changes will resolve the risk",
  "uph_impact": "e.g. UPH will temporarily drop from 840 to 620 during recovery",
  "parameter_changes": {
    "process_temp": 309.0,
    "rpm": 1200,
    "torque": 38.0,
    "tool_wear": 0
  },
  "estimated_recovery_time_seconds": 45
}

Only include parameters that actually need to change in parameter_changes.
Keep parameter values within safe ranges.
NEVER include air_temp in parameter_changes.
`;

    try {
        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 600,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq');

        const plan = JSON.parse(content);

        // Validate required fields
        if (!plan.diagnosis || !plan.action_summary || !plan.parameter_changes) {
            throw new Error('Invalid response structure from Groq');
        }

        // SAFETY NET: strip air_temp even if Groq includes it
        delete plan.parameter_changes.air_temp;

        return plan;
    } catch (err) {
        console.error('[Groq] Recovery plan failed:', err.message);
        return null;
    }
}

/**
 * Asks Groq to generate a brief status report on an asset
 * that is operating well — positive reinforcement for operators.
 */
export async function getGroqStatusInsight(state) {
    if (!groq) return null;

    // Only run occasionally — don't spam API
    if (Math.random() > 0.15) return null;

    const prompt = `
You are an industrial AI assistant. Briefly analyze this machine's 
current operating state in 1-2 sentences. Be specific about the numbers.
Focus on efficiency opportunities or commend good performance.

Asset: ${state.assetType} (${state.machineType}-type)
RPM: ${state.rpm}, Torque: ${state.torque}Nm, 
Air Temp: ${state.air_temp?.toFixed(1)}K,
Efficiency: ${((state.efficiency_score ?? 0) * 100).toFixed(0)}%,
UPH: ${state.uph ?? 0},
Tool Wear: ${state.tool_wear?.toFixed(0)}min

Respond with ONLY JSON: { "insight": "your 1-2 sentence insight here" }
`;

    try {
        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 120,
            response_format: { type: 'json_object' },
        });
        const data = JSON.parse(
            completion.choices[0]?.message?.content ?? '{}'
        );
        return data.insight ?? null;
    } catch {
        return null;
    }
}
