/**
 * WebSocket + Log Server
 * Bridges ML inference (port 3003) with frontend clients (ports 3000, 3001).
 * Maintains in-memory asset state, persists logs to SQLite, broadcasts updates.
 *
 * Features:
 * - HTTP server wraps WebSocket for /health endpoint
 * - verifyClient logs every connection attempt
 * - Robust broadcast with dead-client cleanup
 * - REGISTER handled as first message → sends INITIAL_STATE
 * - Dynamic UPH (Units Per Hour) computed from state + warnings
 * - Groq AI Autonomous Recovery Engine
 * - Auto-optimization toggle (ON/OFF)
 * - air_temp is NEVER modified by recovery — it is ambient/environmental
 */

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { getGroqRecoveryPlan } from './groq-advisor.js';

// ── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3002');
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:3003';
const DB_PATH = process.env.DB_PATH || './logs.db';

// ── Asset Registry ──────────────────────────────────────────
const ASSETS = [
    { assetId: 'conveyor-1', label: 'Conveyor Belt 1', type: 'conveyor', machineType: 'M' },
    { assetId: 'machine-1', label: 'CNC Machine 1', type: 'machine', machineType: 'M' },
    { assetId: 'conveyor-2', label: 'Conveyor Belt 2', type: 'conveyor', machineType: 'L' },
    { assetId: 'machine-2', label: 'CNC Machine 2', type: 'machine', machineType: 'L' },
    { assetId: 'conveyor-3', label: 'Conveyor Belt 3', type: 'conveyor', machineType: 'M' },
    { assetId: 'machine-3', label: 'CNC Machine 3', type: 'machine', machineType: 'H' },
    { assetId: 'conveyor-4', label: 'Conveyor Belt 4', type: 'conveyor', machineType: 'L' },
    { assetId: 'machine-4', label: 'CNC Machine 4', type: 'machine', machineType: 'L' },
    { assetId: 'conveyor-5', label: 'Conveyor Belt 5', type: 'conveyor', machineType: 'H' },
    { assetId: 'machine-5', label: 'CNC Machine 5', type: 'machine', machineType: 'H' },
    { assetId: 'pcb-line-1', label: 'PCB Assembly', type: 'pcb', machineType: 'H' },
];

// ── Database Setup ──────────────────────────────────────────
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS asset_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    asset_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    machine_type TEXT,
    air_temp REAL,
    process_temp REAL,
    rpm REAL,
    torque REAL,
    tool_wear REAL,
    energy_kwh REAL,
    output_units INTEGER,
    efficiency_score REAL,
    active_warnings TEXT,
    hdf_prob REAL,
    pwf_prob REAL,
    osf_prob REAL,
    twf_prob REAL,
    rnf_prob REAL,
    machine_failure_prob REAL
  )
`);

// Add uph column if it doesn't exist yet
try {
    db.exec(`ALTER TABLE asset_logs ADD COLUMN uph INTEGER`);
    console.log('[DB] Added uph column to asset_logs');
} catch {
    // Column already exists — ignore
}

db.exec(`
  CREATE TABLE IF NOT EXISTS dismissed_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    asset_id TEXT NOT NULL,
    warning_type TEXT NOT NULL,
    dismissed_by TEXT DEFAULT 'operator'
  )
`);

const insertLog = db.prepare(`
  INSERT INTO asset_logs (
    timestamp, asset_id, asset_type, machine_type,
    air_temp, process_temp, rpm, torque, tool_wear,
    energy_kwh, output_units, efficiency_score, active_warnings,
    hdf_prob, pwf_prob, osf_prob, twf_prob, rnf_prob, machine_failure_prob,
    uph
  ) VALUES (
    @timestamp, @asset_id, @asset_type, @machine_type,
    @air_temp, @process_temp, @rpm, @torque, @tool_wear,
    @energy_kwh, @output_units, @efficiency_score, @active_warnings,
    @hdf_prob, @pwf_prob, @osf_prob, @twf_prob, @rnf_prob, @machine_failure_prob,
    @uph
  )
`);

const insertDismissed = db.prepare(`
  INSERT INTO dismissed_warnings (timestamp, asset_id, warning_type, dismissed_by)
  VALUES (@timestamp, @asset_id, @warning_type, @dismissed_by)
`);

const queryLogs = db.prepare(`
  SELECT * FROM asset_logs WHERE asset_id = ? ORDER BY timestamp DESC LIMIT ?
`);

// ── Auto-Optimization Toggle ────────────────────────────────
// Global toggle — controlled by frontend message. OFF by default.
let autoOptimizationEnabled = false;

// ── In-Memory State Store ───────────────────────────────────
/** @type {Map<string, object>} */
const assetStates = new Map();

function createDefaultState(asset) {
    return {
        assetId: asset.assetId,
        assetType: asset.type,
        machineType: asset.machineType,
        air_temp: 298.0,
        process_temp: 308.0,
        rpm: 1200,
        torque: 35.0,
        tool_wear: 50,
        energy_kwh: 0,
        output_units: 0,
        uph: 900,
        efficiency_score: 1.0,
        activeWarnings: [],
        probabilities: {},
        // Cooling system state (HDF recovery)
        coolingActive: false,
        coolingStartTime: null,
        coolingTargetProcessTemp: null,
        isProcessRunning: true,
    };
}

// Initialize all assets
for (const asset of ASSETS) {
    assetStates.set(asset.assetId, createDefaultState(asset));
}

// ── Client Registry (single source of truth) ────────────────
// Each entry: { ws: WebSocket, clientType: string }
const clients = new Set();

// ── Broadcasting ────────────────────────────────────────────
function broadcast(message) {
    const payload = JSON.stringify(message);
    const dead = [];

    for (const client of clients) {
        if (client.ws.readyState === 1) { // 1 = OPEN
            try {
                client.ws.send(payload);
            } catch (err) {
                console.error('[broadcast] Send failed:', err.message);
                dead.push(client);
            }
        } else {
            dead.push(client);
        }
    }

    // Clean up dead connections
    dead.forEach(c => clients.delete(c));

    console.log(`[broadcast] ${message.type} → ${clients.size} clients`);
}

function sendTo(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
    }
}

// ── ML Prediction ───────────────────────────────────────────
async function predictForAsset(state) {
    try {
        const res = await fetch(`${ML_SERVER_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                asset_id: state.assetId,
                machine_type: state.machineType,
                air_temp: state.air_temp,
                process_temp: state.process_temp,
                rpm: state.rpm,
                torque: state.torque,
                tool_wear: state.tool_wear,
            }),
        });

        if (!res.ok) {
            console.error(`[ML] Server returned ${res.status}`);
            return null;
        }

        return await res.json();
    } catch (err) {
        // Silence repeated connection-refused noise after first log
        if (!predictForAsset._warned) {
            console.warn(`[ML] Server unreachable: ${err.message}`);
            predictForAsset._warned = true;
        }
        return null;
    }
}

// ── Dynamic UPH Computation ─────────────────────────────────
/**
 * Compute Units Per Hour based on current asset state.
 *
 * Base UPH = (RPM / 100) * 60  (baseline throughput)
 *
 * Modifiers (multiplicative):
 * - Efficiency score:        × efficiency_score
 * - High torque (>60Nm):     × 0.85 (machine straining, slower feed)
 * - High temp (air >310K):   × 0.90 (thermal throttling)
 * - OSF warning active:      × 0.70 (overstrain = forced slowdown)
 * - PWF warning active:      × 0.80 (power limit = reduced throughput)
 * - HDF warning active:      × 0.75 (cooling cycle = machine paused intermittently)
 * - TWF warning active:      × 0.88 (worn tool = slower cut rate)
 * - FAILURE warning active:  × 0.40 (near-failure = emergency slow mode)
 * - Tool wear >180min:       × 0.82 (severely worn tool)
 * - Tool wear >220min:       × 0.60 (tool about to fail)
 * - Dangerous RPM (>2000):   × 0.10 (jamming/breaking components)
 * - Dangerous Torque (>65):  × 0.10 (motor stalling)
 */
function computeUPH(state) {
    const baseUPH = (state.rpm / 100) * 60;

    let modifier = state.efficiency_score ?? 1.0;

    // Hard penalties for dangerously high parameters
    if (state.rpm > 2000) modifier *= 0.10; // Jamming
    if (state.torque > 65) modifier *= 0.10; // Motor stalling
    if (state.process_temp > 315) modifier *= 0.20; // Material melting/ruined parts

    // Normal strain penalties
    if (state.torque > 60) modifier *= 0.85;
    if (state.air_temp > 310) modifier *= 0.90;
    if (state.tool_wear > 180) modifier *= 0.82;
    if (state.tool_wear > 220) modifier *= 0.60;

    // Process halted for cooling → 0 UPH
    if (!state.isProcessRunning) return 0;

    const warningTypes = state.activeWarnings?.map(w => w.type) ?? [];
    if (warningTypes.includes('OSF')) modifier *= 0.70;
    if (warningTypes.includes('PWF')) modifier *= 0.80;
    if (warningTypes.includes('HDF')) modifier *= 0.75;
    if (warningTypes.includes('TWF')) modifier *= 0.88;
    if (warningTypes.includes('FAILURE')) modifier *= 0.40;

    return Math.max(0, Math.round(baseUPH * modifier));
}

// ── Warning Evaluation ──────────────────────────────────────
const WARNING_THRESHOLDS = [
    {
        probKey: 'machine_failure',
        threshold: 0.35,
        type: 'FAILURE',
        messageTemplate: (p) => `High failure probability — ${(p * 100).toFixed(0)}% chance of machine failure. Inspect asset immediately.`,
        severity: 'critical',
    },
    {
        probKey: 'hdf',
        threshold: 0.40,
        type: 'HDF',
        messageTemplate: (p) => `Temperature too high — ${(p * 100).toFixed(0)}% probability of heat dissipation failure.`,
        severity: 'critical',
    },
    {
        probKey: 'osf',
        threshold: 0.40,
        type: 'OSF',
        messageTemplate: (p) => `Overstrain detected — ${(p * 100).toFixed(0)}% probability of overstrain failure.`,
        severity: 'critical',
    },
    {
        probKey: 'pwf',
        threshold: 0.45,
        type: 'PWF',
        messageTemplate: (p) => `Power anomaly — ${(p * 100).toFixed(0)}% probability of power failure.`,
        severity: 'warning',
    },
    {
        probKey: 'twf',
        threshold: 0.55,
        type: 'TWF',
        messageTemplate: (p) => `Tool wear critical — ${(p * 100).toFixed(0)}% probability of tool wear failure.`,
        severity: 'warning',
    },
    {
        probKey: 'rnf',
        threshold: 0.60,
        type: 'RNF',
        messageTemplate: (p) => `Random failure signal — ${(p * 100).toFixed(0)}% probability.`,
        severity: 'warning',
    },
];

// ── Auto-Recovery Rules ─────────────────────────────────────
/**
 * AUTO-RECOVERY RULES
 * When a failure probability exceeds triggerThreshold, automatically
 * apply corrective parameter changes to bring the system back
 * to safe operating conditions.
 *
 * CRITICAL: air_temp is NEVER modified — it is ambient/environmental.
 * Only process_temp, rpm, torque are actuator-controllable.
 *
 * This mimics real actuator responses:
 * - HDF → cooling system activation (halt process, reduce process_temp)
 * - OSF → mechanical governor (reduce RPM + torque)
 * - PWF → load shedding (reduce RPM to lower power draw)
 * - TWF → feed rate reduction (reduce RPM to reduce wear rate)
 * - FAILURE → emergency safe-mode
 */
const RECOVERY_RULES = [
    {
        probKey: 'hdf',
        triggerThreshold: 0.65,
        type: 'HDF',
        description: 'Process halted — cooling system activated. Process temperature reducing gradually.',
        action: (state) => ({
            isProcessRunning: false,
            coolingActive: true,
            coolingStartTime: Date.now(),
            rpm: 0,
            // Only process_temp is controllable — NOT air_temp
            coolingTargetProcessTemp: 309.0,
            // air_temp is intentionally NOT touched — it is ambient
        }),
        cooldownMs: 60000,
    },
    {
        probKey: 'osf',
        triggerThreshold: 0.65,
        type: 'OSF',
        description: 'Mechanical governor engaged — RPM and torque reduced',
        action: (state) => ({
            rpm: Math.max(state.rpm * 0.80, 800),
            torque: Math.max(state.torque * 0.85, 15),
            // air_temp NOT touched
        }),
        cooldownMs: 20000,
    },
    {
        probKey: 'pwf',
        triggerThreshold: 0.65,
        type: 'PWF',
        description: 'Load shedding activated — power draw reduced',
        action: (state) => ({
            rpm: Math.max(state.rpm * 0.85, 800),
            // air_temp NOT touched
        }),
        cooldownMs: 12000,
    },
    {
        probKey: 'twf',
        triggerThreshold: 0.70,
        type: 'TWF',
        description: 'Automated tool replacement initiated. Tool wear reset.',
        action: (state) => ({
            tool_wear: 0,
            rpm: Math.max(state.rpm * 0.90, 800),
            torque: Math.max(state.torque * 0.90, 15),
            // air_temp NOT touched
        }),
        cooldownMs: 30000,
    },
    {
        probKey: 'machine_failure',
        triggerThreshold: 0.75,
        type: 'FAILURE',
        description: 'Emergency safe-mode activated — cooling and parameter reduction engaged',
        action: (state) => ({
            rpm: 900,
            torque: 25.0,
            // Use gradual cooling instead of instant drop
            coolingActive: true,
            coolingStartTime: Date.now(),
            coolingTargetProcessTemp: Math.max(state.process_temp - 6.0, 305.0),
            // air_temp NOT touched
        }),
        cooldownMs: 60000,
    },
];

// Cooldown tracker: Map<assetId_ruleType, timestamp>
const recoveryCooldowns = new Map();

function getConfidence(probability) {
    if (probability > 0.7) return 'high';
    if (probability > 0.5) return 'medium';
    return 'low';
}

function evaluateWarnings(state, probabilities) {
    for (const rule of WARNING_THRESHOLDS) {
        const prob = probabilities[rule.probKey] ?? 0;

        if (prob > rule.threshold) {
            const existing = state.activeWarnings.find((w) => w.type === rule.type);
            if (!existing) {
                state.activeWarnings.push({
                    id: crypto.randomUUID(),
                    type: rule.type,
                    message: rule.messageTemplate(prob),
                    severity: rule.severity,
                    assetId: state.assetId,
                    timestamp: Date.now(),
                    probability: prob,
                    confidence: getConfidence(prob),
                });
            } else {
                existing.probability = prob;
                existing.confidence = getConfidence(prob);
                existing.message = rule.messageTemplate(prob);
            }
        } else {
            const resolved = state.activeWarnings.find((w) => w.type === rule.type);
            if (resolved) {
                state.activeWarnings = state.activeWarnings.filter((w) => w.type !== rule.type);
                broadcast({
                    type: 'WARNING_RESOLVED',
                    assetId: state.assetId,
                    warningType: rule.type,
                    reason: 'probability_below_threshold',
                });
            }
        }
    }
}

// ── Groq AI Autonomous Recovery Engine ──────────────────────
/**
 * Checks all recovery rules against current probabilities.
 * If rules trigger and are not in cooldown:
 * 1. Broadcasts AI_THINKING to frontends
 * 2. Requests Groq LLM recovery plan
 * 3. Applies Groq's parameter changes (or falls back to rule-based)
 * 4. Broadcasts RECOVERY_ACTION with full diagnosis
 *
 * NEVER modifies air_temp — strips it from Groq responses too.
 */
async function applyRecoveryActions(state, probabilities) {
    // Find which rules are triggered
    const triggeredRules = RECOVERY_RULES.filter(rule => {
        const prob = probabilities[rule.probKey] ?? 0;
        const cooldownKey = `${state.assetId}_${rule.type}`;
        const lastRecovery = recoveryCooldowns.get(cooldownKey) ?? 0;
        const inCooldown = (Date.now() - lastRecovery) < rule.cooldownMs;
        return prob >= rule.triggerThreshold && !inCooldown;
    });

    if (triggeredRules.length === 0) return false;

    console.log(
        `[Groq] Requesting recovery plan for ${state.assetId}. ` +
        `Triggered rules: ${triggeredRules.map(r => r.type).join(', ')}`
    );

    // Broadcast "AI is thinking" status immediately so frontends show it
    broadcast({
        type: 'AI_THINKING',
        assetId: state.assetId,
        message: `Groq AI analyzing ${triggeredRules.map(r => r.type).join('+')} risk on ${state.assetId}...`,
        timestamp: Date.now(),
    });

    // Get Groq's recovery plan
    let plan = await getGroqRecoveryPlan(state, probabilities, triggeredRules);

    let parametersBefore = {};
    let parametersAfter = {};
    let description = '';
    let diagnosis = '';

    if (plan) {
        // USE GROQ'S RECOMMENDED PARAMETERS
        console.log('[Groq] Recovery plan received:', plan.action_summary);

        // CRITICAL: Strip air_temp from Groq's response — it's ambient
        delete plan.parameter_changes.air_temp;

        for (const [param, newValue] of Object.entries(plan.parameter_changes)) {
            if (param in state && typeof newValue === 'number') {
                parametersBefore[param] = state[param];

                // Gradual reduction for process_temp — use cooling system
                if (param === 'process_temp' && newValue < state.process_temp) {
                    state.coolingActive = true;
                    state.coolingStartTime = Date.now();
                    state.coolingTargetProcessTemp = newValue;
                    parametersAfter[param] = newValue;
                } else {
                    state[param] = newValue;
                    parametersAfter[param] = newValue;
                }
            }
        }

        description = plan.action_summary;
        diagnosis = plan.diagnosis;
    } else {
        // FALLBACK: use rule-based recovery if Groq fails
        console.warn('[Groq] Falling back to rule-based recovery');

        for (const rule of triggeredRules) {
            const corrections = rule.action(state);
            for (const [param, newValue] of Object.entries(corrections)) {
                if (param === 'air_temp') continue; // NEVER touch air_temp

                // Gradual reduction for process_temp — use cooling system
                if (param === 'process_temp' && typeof newValue === 'number' && newValue < state[param]) {
                    state.coolingActive = true;
                    state.coolingStartTime = Date.now();
                    state.coolingTargetProcessTemp = newValue;
                    parametersBefore[param] = state[param];
                    parametersAfter[param] = newValue;
                } else {
                    parametersBefore[param] = state[param];
                    state[param] = newValue;
                    parametersAfter[param] = newValue;
                }
            }
        }
        description = triggeredRules.map(r => r.description).join('; ');
        diagnosis = 'Rule-based recovery applied (Groq unavailable)';
    }

    // Set cooldowns for all triggered rules
    const now = Date.now();
    for (const rule of triggeredRules) {
        recoveryCooldowns.set(`${state.assetId}_${rule.type}`, now);
    }

    // Recompute energy and UPH after parameter changes
    state.energy_kwh = state.isProcessRunning
        ? state.rpm * state.torque * 0.0001
        : 0;
    state.uph = computeUPH(state);

    // Broadcast the full recovery event
    broadcast({
        type: 'RECOVERY_ACTION',
        assetId: state.assetId,
        ruleType: triggeredRules.map(r => r.type).join('+'),
        description,
        diagnosis,
        reasoning: plan?.reasoning ?? '',
        uphImpact: plan?.uph_impact ?? '',
        estimatedRecoverySeconds: plan?.estimated_recovery_time_seconds ?? 30,
        probability: Math.max(
            ...triggeredRules.map(r => probabilities[r.probKey] ?? 0)
        ),
        parametersBefore,
        parametersAfter,
        groqPowered: !!plan,
        timestamp: now,
    });

    console.log(`[Recovery] ${state.assetId}: ${description}`);
    return true;
}

// ── Evaluate and Suggest Only (Manual Mode) ─────────────────
/**
 * When auto-optimization is OFF, we still evaluate what the AI
 * WOULD do, and broadcast a suggestion. No parameters are changed.
 */
async function evaluateAndSuggestOnly(state, probabilities) {
    const wouldTrigger = RECOVERY_RULES.filter(rule => {
        const prob = probabilities[rule.probKey] ?? 0;
        const cooldownKey = `${state.assetId}_${rule.type}`;
        const lastRecovery = recoveryCooldowns.get(cooldownKey) ?? 0;
        const inCooldown = (Date.now() - lastRecovery) < rule.cooldownMs;
        return prob >= rule.triggerThreshold && !inCooldown;
    });

    if (wouldTrigger.length === 0) return;

    // Broadcast a SUGGESTION (not an action) — shows what AI WOULD do
    broadcast({
        type: 'RECOVERY_SUGGESTION',
        assetId: state.assetId,
        message: `Auto-optimization is OFF. AI would apply: ` +
            wouldTrigger.map(r => r.description).join('; '),
        rules: wouldTrigger.map(r => r.type),
        timestamp: Date.now(),
    });
}

// ── Log to SQLite ───────────────────────────────────────────
function logState(state) {
    try {
        insertLog.run({
            timestamp: Date.now(),
            asset_id: state.assetId,
            asset_type: state.assetType,
            machine_type: state.machineType,
            air_temp: state.air_temp,
            process_temp: state.process_temp,
            rpm: state.rpm,
            torque: state.torque,
            tool_wear: state.tool_wear,
            energy_kwh: state.energy_kwh,
            output_units: state.output_units,
            efficiency_score: state.efficiency_score,
            active_warnings: JSON.stringify(state.activeWarnings),
            hdf_prob: state.probabilities.hdf ?? null,
            pwf_prob: state.probabilities.pwf ?? null,
            osf_prob: state.probabilities.osf ?? null,
            twf_prob: state.probabilities.twf ?? null,
            rnf_prob: state.probabilities.rnf ?? null,
            machine_failure_prob: state.probabilities.machine_failure ?? null,
            uph: state.uph ?? null,
        });
    } catch (err) {
        console.error(`[sqlite] Write error: ${err.message}`);
    }
}

// ── Process Parameter Update ────────────────────────────────
async function handleParameterUpdate(assetId, params) {
    const state = assetStates.get(assetId);
    if (!state) {
        console.warn(`[handleParameterUpdate] Unknown assetId: ${assetId}`);
        return;
    }

    // Update in-memory state with provided params
    // Operator CAN set air_temp via slider (it's a simulation input),
    // but recovery actions never will.
    for (const [key, value] of Object.entries(params)) {
        if (key in state) {
            state[key] = value;
        }
    }

    // Recompute energy
    state.energy_kwh = state.isProcessRunning
        ? state.rpm * state.torque * 0.0001
        : 0;

    // Call ML server
    const prediction = await predictForAsset(state);
    if (prediction) {
        state.probabilities = prediction.probabilities;
        state.efficiency_score = prediction.efficiency_score;

        if (autoOptimizationEnabled) {
            // FULL AUTO: apply recovery actions
            const recoveryFired = await applyRecoveryActions(
                state, prediction.probabilities
            );

            if (recoveryFired) {
                // Re-run ML with corrected parameters
                const recheck = await predictForAsset(state);
                if (recheck) {
                    state.probabilities = recheck.probabilities;
                    state.efficiency_score = recheck.efficiency_score;
                }
                // Recompute energy after parameter changes
                state.energy_kwh = state.isProcessRunning
                    ? state.rpm * state.torque * 0.0001
                    : 0;
            }
        } else {
            // MANUAL MODE: only evaluate warnings, suggest but don't act
            await evaluateAndSuggestOnly(state, prediction.probabilities);
        }

        evaluateWarnings(state, state.probabilities);
    }

    // Compute UPH after all updates
    state.uph = computeUPH(state);
    state.output_units += Math.floor(state.uph / 360);

    // Log to SQLite
    logState(state);

    // BROADCAST TO ALL CLIENTS — this updates the Digital Twin
    broadcast({
        type: 'STATE_UPDATE',
        assetId: state.assetId,
        state: { ...state },
    });

    console.log(`[handleParameterUpdate] ${assetId} done. Clients: ${clients.size}`);
}

// ── Tool Wear Auto-Increment ────────────────────────────────
setInterval(async () => {
    for (const [assetId, state] of assetStates) {
        // Increment wear and recompute energy
        state.tool_wear += 0.5 + Math.random() * 1.5;
        state.energy_kwh = state.isProcessRunning
            ? state.rpm * state.torque * 0.0001
            : 0;

        const prediction = await predictForAsset(state);

        if (prediction) {
            state.probabilities = prediction.probabilities;
            state.efficiency_score = prediction.efficiency_score;

            if (autoOptimizationEnabled) {
                const recoveryFired = await applyRecoveryActions(
                    state, prediction.probabilities
                );

                if (recoveryFired) {
                    const recheck = await predictForAsset(state);
                    if (recheck) {
                        state.probabilities = recheck.probabilities;
                        state.efficiency_score = recheck.efficiency_score;
                    }
                    state.energy_kwh = state.isProcessRunning
                        ? state.rpm * state.torque * 0.0001
                        : 0;
                }
            } else {
                await evaluateAndSuggestOnly(state, prediction.probabilities);
            }

            evaluateWarnings(state, state.probabilities);
        }

        // Compute UPH and increment output AFTER all ML and recovery checks
        state.uph = computeUPH(state);
        state.output_units += Math.floor(state.uph / 360);

        logState(state);

        broadcast({
            type: 'STATE_UPDATE',
            assetId: state.assetId,
            state: { ...state },
        });
    }
}, 10_000);

// ── Cooling Interval ────────────────────────────────────────
// Only reduces process_temp — NEVER air_temp (it is ambient/environmental)
setInterval(() => {
    for (const [assetId, state] of assetStates) {
        if (!state.coolingActive) continue;

        let changed = false;

        // ONLY process_temp is reduced — air_temp is ambient, untouchable
        if (state.process_temp > (state.coolingTargetProcessTemp ?? 309.0)) {
            state.process_temp = Math.max(
                state.process_temp - (0.8 + Math.random() * 0.4),
                state.coolingTargetProcessTemp ?? 309.0
            );
            changed = true;
        }

        // Cooling complete when process_temp reaches target
        const processCooled = state.process_temp <=
            (state.coolingTargetProcessTemp ?? 309.0) + 0.2;

        if (processCooled) {
            state.coolingActive = false;
            state.coolingStartTime = null;
            state.isProcessRunning = true;
            state.rpm = 1500;

            console.log(`[Cooling] ${assetId}: process_temp normalized. Restarting.`);
            broadcast({
                type: 'PROCESS_RESTARTED',
                assetId,
                message: `${assetId}: Process temperature normalized. Restarting automatically.`,
                timestamp: Date.now(),
            });
            changed = true;
        }

        if (changed) {
            state.energy_kwh = state.isProcessRunning
                ? state.rpm * state.torque * 0.0001
                : 0;
            state.uph = computeUPH(state);
            broadcast({
                type: 'STATE_UPDATE',
                assetId,
                state: { ...state },
            });
        }
    }
}, 3000);

// ── HTTP Server (for health check + CORS) ───────────────────
const httpServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            clients: clients.size,
            assets: assetStates.size,
            autoOptimization: autoOptimizationEnabled,
            timestamp: Date.now(),
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// ── WebSocket Server (attached to HTTP server) ──────────────
const wss = new WebSocketServer({
    server: httpServer,
    verifyClient: (info, done) => {
        const origin = info.origin ?? '';
        const allowed = [
            'http://localhost:3000',
            'http://localhost:3001',
            ''  // allow no-origin (direct connections)
        ];
        const isAllowed = allowed.some(o => origin.startsWith(o)) || origin === '';
        console.log(`[WS] Connection from origin: "${origin}" — ${isAllowed ? 'ACCEPTED' : 'REJECTED'}`);
        done(true); // Accept ALL for local dev
    },
});

wss.on('connection', (ws, req) => {
    console.log(`[WS] New connection from: ${req.socket.remoteAddress}`);

    let clientType = 'unknown';
    let registered = false;
    const clientObj = { ws, clientType };

    ws.on('message', async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            console.error('[WS] Invalid JSON received');
            return;
        }

        switch (msg.type) {
            case 'REGISTER': {
                clientType = msg.clientType || 'unknown';
                clientObj.clientType = clientType;

                if (!registered) {
                    registered = true;
                    clients.add(clientObj);
                    console.log(`[WS] Client registered: ${clientType} (total: ${clients.size})`);
                }

                // Send current state of ALL assets to the newly registered client
                const statesObj = {};
                for (const [id, state] of assetStates) {
                    statesObj[id] = { ...state };
                }
                sendTo(ws, {
                    type: 'INITIAL_STATE',
                    states: statesObj,
                });

                // Also send current auto-optimization state
                sendTo(ws, {
                    type: 'AUTO_OPTIMIZATION_STATE',
                    enabled: autoOptimizationEnabled,
                    timestamp: Date.now(),
                });
                break;
            }

            case 'PARAMETER_UPDATE': {
                if (!registered) {
                    console.warn('[WS] Message from unregistered client, ignoring');
                    return;
                }
                const { assetId, params } = msg;
                if (assetId && params) {
                    await handleParameterUpdate(assetId, params);
                }
                break;
            }

            case 'SET_AUTO_OPTIMIZATION': {
                if (!registered) return;
                autoOptimizationEnabled = msg.enabled === true;
                console.log(`[AutoOpt] Auto-optimization ${autoOptimizationEnabled ? 'ENABLED' : 'DISABLED'}`);

                // Broadcast new state to all clients
                broadcast({
                    type: 'AUTO_OPTIMIZATION_STATE',
                    enabled: autoOptimizationEnabled,
                    timestamp: Date.now(),
                });
                break;
            }

            case 'DISMISS_WARNING': {
                if (!registered) return;
                const { assetId, warningId } = msg;
                const state = assetStates.get(assetId);
                if (state) {
                    const warning = state.activeWarnings.find((w) => w.id === warningId);
                    state.activeWarnings = state.activeWarnings.filter((w) => w.id !== warningId);

                    if (warning) {
                        try {
                            insertDismissed.run({
                                timestamp: Date.now(),
                                asset_id: assetId,
                                warning_type: warning.type,
                                dismissed_by: 'operator',
                            });
                        } catch (err) {
                            console.error(`[sqlite] Dismiss write error: ${err.message}`);
                        }
                    }

                    broadcast({
                        type: 'WARNING_DISMISSED',
                        assetId,
                        warningId,
                    });
                }
                break;
            }

            case 'GET_LOGS': {
                if (!registered) return;
                const { assetId, limit = 100 } = msg;
                try {
                    const logs = queryLogs.all(assetId, limit);
                    sendTo(ws, {
                        type: 'LOGS_RESPONSE',
                        assetId,
                        logs,
                    });
                } catch (err) {
                    console.error(`[sqlite] Query error: ${err.message}`);
                    sendTo(ws, {
                        type: 'LOGS_RESPONSE',
                        assetId,
                        logs: [],
                    });
                }
                break;
            }

            case 'RESET_ALL': {
                if (!registered) return;

                console.log('[WS] RESET_ALL received — restoring default states');

                // Reset every asset to default safe values
                for (const asset of ASSETS) {
                    const state = assetStates.get(asset.assetId);
                    if (state) {
                        state.air_temp = 298.0;
                        state.process_temp = 308.0;
                        state.rpm = 1200;
                        state.torque = 35.0;
                        // Do NOT reset tool_wear — it's cumulative wear
                        state.energy_kwh = 1200 * 35.0 * 0.0001;
                        state.efficiency_score = 1.0;
                        state.uph = 900;
                        state.activeWarnings = [];
                        state.probabilities = {};
                        state.coolingActive = false;
                        state.coolingStartTime = null;
                        state.coolingTargetProcessTemp = null;
                        state.isProcessRunning = true;
                    }
                }

                // Broadcast full updated state to ALL clients
                const resetStatesObj = {};
                for (const [id, state] of assetStates) {
                    resetStatesObj[id] = { ...state };
                }

                broadcast({
                    type: 'INITIAL_STATE',
                    states: resetStatesObj,
                });

                // Log the reset event for each asset
                for (const asset of ASSETS) {
                    const state = assetStates.get(asset.assetId);
                    if (state) logState(state);
                }

                console.log('[WS] RESET_ALL complete — all assets restored to defaults');
                break;
            }

            default:
                console.warn(`[WS] Unknown message type: ${msg.type}`);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[WS] Client disconnected. Code: ${code}, Type: ${clientType}`);
        clients.delete(clientObj);
    });

    ws.on('error', (err) => {
        console.error(`[WS] Client error: ${err.message}`);
        clients.delete(clientObj);
    });
});

wss.on('error', (err) => {
    console.error('[WS Server] WebSocket server error:', err);
});

// ── Start HTTP+WS Server ────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  WebSocket + Log Server                              ║
║  Port: ${PORT}                                         ║
║  ML Server: ${ML_SERVER_URL}              ║
║  Database: ${DB_PATH}                                ║
║  Assets: ${ASSETS.length}                                          ║
║  Health: http://localhost:${PORT}/health                 ║
║  Groq AI: ${process.env.GROQ_API_KEY ? 'ENABLED' : 'DISABLED (no API key)'}                          ║
║  Auto-Opt: ${autoOptimizationEnabled ? 'ON' : 'OFF (default)'}                               ║
╚══════════════════════════════════════════════════════╝
`);
});

httpServer.on('error', (err) => {
    console.error('[HTTP Server] Error:', err);
});
