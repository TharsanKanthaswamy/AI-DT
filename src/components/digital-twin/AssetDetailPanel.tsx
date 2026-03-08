'use client';

import React from 'react';
import {
    X, AlertTriangle, Wrench, ArrowRight, Cpu, Grid3X3,
    TrendingUp, DollarSign, Thermometer, Zap, Lightbulb,
    ShieldCheck,
} from 'lucide-react';
import { AssetState, ASSETS } from '../../lib/assets';
import { RecoveryEvent } from '../../lib/useWebSocket';

/* ── Types ──────────────────────────────────────────────────── */

interface Suggestion {
    id: string;
    type: 'warning_reason' | 'improvement' | 'profit';
    icon: 'alert' | 'trending-up' | 'dollar' | 'thermometer' | 'zap';
    title: string;
    detail: string;
    priority: 'high' | 'medium' | 'low';
}

interface AssetDetailPanelProps {
    assetState: AssetState | undefined;
    onClose: () => void;
    onDismissWarning: (assetId: string, warningId: string) => void;
    efficiencyHistory: number[];
    recoveryEvents?: RecoveryEvent[];
}

/* ── Helpers ────────────────────────────────────────────────── */

function getIcon(type: string) {
    switch (type) {
        case 'machine': return <Wrench className="w-5 h-5" />;
        case 'conveyor': return <ArrowRight className="w-5 h-5" />;
        case 'pcb': return <Cpu className="w-5 h-5" />;
        case 'floor': return <Grid3X3 className="w-5 h-5" />;
        default: return <Wrench className="w-5 h-5" />;
    }
}

function getAssetLabel(assetId: string): string {
    const asset = ASSETS.find(a => a.assetId === assetId);
    return asset?.label ?? assetId;
}

function getAssetType(assetId: string): string {
    const asset = ASSETS.find(a => a.assetId === assetId);
    return asset?.type ?? 'machine';
}

/* ── Suggestion Generation ──────────────────────────────────── */

function generateSuggestions(state: AssetState): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const probs = state.probabilities ?? {};

    // HDF Warning — temperature cause
    if ((probs.hdf ?? 0) > 0.40) {
        const tempDelta = (state.process_temp ?? 310) - (state.air_temp ?? 300);
        suggestions.push({
            id: 'reason-hdf', type: 'warning_reason', icon: 'thermometer',
            title: 'Why: Heat Dissipation Risk',
            detail: `Process temperature (${state.process_temp?.toFixed(1)}K) is ` +
                `${tempDelta.toFixed(1)}K above ambient (${state.air_temp?.toFixed(1)}K). ` +
                `Reduce process temp below 312K or increase cooling time.`,
            priority: (probs.hdf ?? 0) > 0.7 ? 'high' : 'medium',
        });
    }

    // OSF Warning — RPM + torque cause
    if ((probs.osf ?? 0) > 0.40) {
        suggestions.push({
            id: 'reason-osf', type: 'warning_reason', icon: 'zap',
            title: 'Why: Overstrain Risk',
            detail: `RPM (${state.rpm}) × Torque (${state.torque}Nm) = ` +
                `${((state.rpm ?? 0) * (state.torque ?? 0)).toFixed(0)} power units — ` +
                `exceeds safe threshold. Reduce RPM below 1800 or torque below 50Nm.`,
            priority: (probs.osf ?? 0) > 0.7 ? 'high' : 'medium',
        });
    }

    // PWF Warning — power/energy cause
    if ((probs.pwf ?? 0) > 0.45) {
        suggestions.push({
            id: 'reason-pwf', type: 'warning_reason', icon: 'dollar',
            title: 'Why: Power Consumption Risk',
            detail: `Energy draw (${state.energy_kwh?.toFixed(2)} kWh) is abnormally high. ` +
                `Reduce torque by 10–15Nm to lower power draw without impacting throughput.`,
            priority: 'medium',
        });
    }

    // TWF Warning — tool wear cause
    if ((probs.twf ?? 0) > 0.55) {
        suggestions.push({
            id: 'reason-twf', type: 'warning_reason', icon: 'alert',
            title: 'Why: Tool Wear Failure Risk',
            detail: `Tool wear at ${state.tool_wear?.toFixed(0)} min. Worn tools require ` +
                `higher torque, accelerating stress. Schedule replacement at next stop.`,
            priority: (probs.twf ?? 0) > 0.65 ? 'high' : 'medium',
        });
    }

    // RPM too low — productivity opportunity
    if ((state.rpm ?? 0) < 1000 && (probs.osf ?? 0) < 0.30 && (probs.machine_failure ?? 0) < 0.25) {
        const currentOutput = state.output_units ?? 0;
        const projectedOutput = Math.floor(currentOutput * 1.25);
        suggestions.push({
            id: 'improve-rpm-low', type: 'improvement', icon: 'trending-up',
            title: 'Increase RPM for Higher Throughput',
            detail: `RPM (${state.rpm}) is below optimal. Stress indicators are low — ` +
                `safe to increase to 1400–1600. Est. +20–25% throughput (~${projectedOutput} units).`,
            priority: 'medium',
        });
    }

    // Efficiency low but no critical warnings
    if ((state.efficiency_score ?? 1) < 0.6 &&
        !state.activeWarnings?.some(w => w.severity === 'critical')) {
        suggestions.push({
            id: 'improve-efficiency', type: 'improvement', icon: 'trending-up',
            title: 'Efficiency Below Optimal',
            detail: `Efficiency at ${((state.efficiency_score ?? 0) * 100).toFixed(0)}% ` +
                `with no critical faults. Try: RPM 1400–1600, Torque 35–45Nm, Air temp 298–302K ` +
                `for 80%+ efficiency on ${state.machineType}-type machines.`,
            priority: 'medium',
        });
    }

    // High efficiency — positive reinforcement
    if ((state.efficiency_score ?? 0) > 0.85 && (state.activeWarnings?.length ?? 0) === 0) {
        suggestions.push({
            id: 'maintain-efficiency', type: 'profit', icon: 'dollar',
            title: 'Operating at Peak Efficiency',
            detail: `Efficiency at ${((state.efficiency_score ?? 0) * 100).toFixed(0)}%. ` +
                `Current parameters optimal. Maintain RPM ${state.rpm}, Torque ${state.torque}Nm. ` +
                `No changes recommended.`,
            priority: 'low',
        });
    }

    // Temperature approaching risk
    if ((state.air_temp ?? 300) > 306 && (probs.hdf ?? 0) < 0.40) {
        suggestions.push({
            id: 'temp-preventive', type: 'improvement', icon: 'thermometer',
            title: 'Preventive: Temperature Trending High',
            detail: `Air temp at ${state.air_temp?.toFixed(1)}K approaching HDF threshold (>310K). ` +
                `Reducing by 3–5K now prevents potential failure and downtime.`,
            priority: 'low',
        });
    }

    // Tool wear approaching critical
    if ((state.tool_wear ?? 0) > 150 && (probs.twf ?? 0) < 0.55) {
        suggestions.push({
            id: 'toolwear-preventive', type: 'improvement', icon: 'alert',
            title: 'Preventive: Schedule Tool Replacement',
            detail: `Tool wear at ${state.tool_wear?.toFixed(0)} min (threshold ~200). ` +
                `Schedule replacement during next planned maintenance.`,
            priority: 'low',
        });
    }

    // Sort: warning reasons first, then improvements, then by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const typeOrder: Record<string, number> = { warning_reason: 0, improvement: 1, profit: 2 };

    return suggestions.sort((a, b) => {
        const typeComp = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
        if (typeComp !== 0) return typeComp;
        return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    });
}

/* ── Sub-components ─────────────────────────────────────────── */

const SUGGESTION_ICON_MAP: Record<string, React.ReactNode> = {
    'alert': <AlertTriangle size={14} />,
    'trending-up': <TrendingUp size={14} />,
    'dollar': <DollarSign size={14} />,
    'thermometer': <Thermometer size={14} />,
    'zap': <Zap size={14} />,
};

const TYPE_COLORS = {
    warning_reason: {
        border: 'border-orange-500/40', bg: 'bg-orange-950/30',
        iconColor: 'text-orange-400', titleColor: 'text-orange-300',
        badge: 'bg-orange-500/20 text-orange-300', badgeText: 'ROOT CAUSE',
    },
    improvement: {
        border: 'border-blue-500/40', bg: 'bg-blue-950/30',
        iconColor: 'text-blue-400', titleColor: 'text-blue-300',
        badge: 'bg-blue-500/20 text-blue-300', badgeText: 'SUGGESTION',
    },
    profit: {
        border: 'border-green-500/40', bg: 'bg-green-950/30',
        iconColor: 'text-green-400', titleColor: 'text-green-300',
        badge: 'bg-green-500/20 text-green-300', badgeText: 'OPTIMAL',
    },
};

function EfficiencyRing({ score }: { score: number }) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score * circumference);
    const color = score > 0.7 ? '#22c55e' : score > 0.4 ? '#eab308' : '#ef4444';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={radius} fill="none" stroke="#2a2a4a" strokeWidth="6" />
                <circle
                    cx="40" cy="40" r={radius} fill="none"
                    stroke={color} strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
                />
            </svg>
            <div className="absolute text-center">
                <div className="text-lg font-bold" style={{ color }}>
                    {(score * 100).toFixed(0)}%
                </div>
            </div>
        </div>
    );
}

function MiniSparkline({ data }: { data: number[] }) {
    if (data.length === 0) {
        return <div className="text-xs text-slate-500">No data</div>;
    }

    const width = 180;
    const height = 40;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data
        .map((val, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        })
        .join(' ');

    const lastVal = data[data.length - 1];
    const color = lastVal > 0.7 ? '#22c55e' : lastVal > 0.4 ? '#eab308' : '#ef4444';

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ── Main Component ─────────────────────────────────────────── */

export default function AssetDetailPanel({
    assetState,
    onClose,
    onDismissWarning,
    efficiencyHistory,
    recoveryEvents = [],
}: AssetDetailPanelProps) {
    if (!assetState) return null;

    const assetLabel = getAssetLabel(assetState.assetId);
    const assetType = getAssetType(assetState.assetId);
    const effScore = assetState.efficiency_score ?? 0;
    const suggestions = generateSuggestions(assetState);
    const assetRecoveries = recoveryEvents
        .filter(e => e.assetId === assetState.assetId)
        .slice(0, 3);

    return (
        <div className="fixed right-4 top-20 w-80 z-40 pointer-events-auto max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <div className="bg-slate-900/95 backdrop-blur-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="text-blue-400">
                            {getIcon(assetType)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{assetLabel}</h3>
                            <p className="text-[10px] text-slate-400 uppercase">{assetState.assetId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Efficiency Ring */}
                <div className="flex items-center justify-center py-3">
                    <EfficiencyRing score={effScore} />
                </div>

                {/* Parameters */}
                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-slate-400">RPM</div>
                        <div className="text-sm font-mono font-bold text-white">{assetState.rpm?.toFixed(0) ?? '—'}</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-slate-400">Temperature</div>
                        <div className="text-sm font-mono font-bold text-white">{assetState.air_temp?.toFixed(1) ?? '—'} K</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-slate-400">Torque</div>
                        <div className="text-sm font-mono font-bold text-white">{assetState.torque?.toFixed(1) ?? '—'} Nm</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-slate-400">Tool Wear</div>
                        <div className="text-sm font-mono font-bold text-white">{assetState.tool_wear?.toFixed(0) ?? '—'} min</div>
                    </div>
                    {/* UPH — full width, color coded */}
                    <div className={`col-span-2 rounded-lg p-2 ${(assetState.uph ?? 0) > 700
                        ? 'bg-green-950/40 border border-green-500/30'
                        : (assetState.uph ?? 0) > 400
                            ? 'bg-yellow-950/40 border border-yellow-500/30'
                            : 'bg-red-950/40 border border-red-500/30'
                        }`}>
                        <div className="text-[10px] text-slate-400">Units Per Hour (UPH)</div>
                        <div className={`text-lg font-bold ${(assetState.uph ?? 0) > 700 ? 'text-green-400'
                            : (assetState.uph ?? 0) > 400 ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}>
                            {assetState.uph ?? 0}
                            <span className="text-xs font-normal text-slate-400 ml-1">units/hr</span>
                        </div>
                    </div>
                </div>

                {/* Mini Sparkline */}
                <div className="px-4 pb-3">
                    <div className="text-[10px] text-slate-400 mb-1">Efficiency Trend</div>
                    <div className="bg-slate-800/40 rounded-lg p-2 flex justify-center">
                        <MiniSparkline data={efficiencyHistory} />
                    </div>
                </div>

                {/* Active Warnings */}
                {assetState.activeWarnings?.length > 0 && (
                    <div className="border-t border-slate-700">
                        <div className="px-4 py-2">
                            <div className="text-[10px] text-slate-400 uppercase mb-2">
                                Warnings ({assetState.activeWarnings.length})
                            </div>
                            <div className="space-y-1">
                                {assetState.activeWarnings.map((w) => (
                                    <div
                                        key={w.id}
                                        className={`flex items-start gap-2 p-2 rounded-lg text-xs ${w.severity === 'critical'
                                            ? 'bg-red-500/10 text-red-300'
                                            : 'bg-yellow-500/10 text-yellow-300'
                                            }`}
                                    >
                                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span className="flex-1 leading-tight">{w.message}</span>
                                        <button
                                            onClick={() => onDismissWarning(assetState.assetId, w.id)}
                                            className="text-slate-400 hover:text-white p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {/* Auto-Recovery Actions */}
                {assetRecoveries.length > 0 && (
                    <div className="border-t border-slate-700">
                        <div className="px-4 py-2">
                            <h4 className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ShieldCheck size={12} />
                                Auto-Recovery Actions
                            </h4>
                            <div className="space-y-2">
                                {assetRecoveries.map(event => (
                                    <div key={event.id} className={`p-2 rounded-lg border ${event.groqPowered
                                        ? 'bg-purple-950/30 border-purple-500/25'
                                        : 'bg-green-950/30 border-green-500/25'
                                        }`}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className={`text-xs font-medium ${event.groqPowered ? 'text-purple-300' : 'text-green-300'
                                                }`}>
                                                {event.description}
                                            </span>
                                            {event.groqPowered && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                                                    GROQ AI
                                                </span>
                                            )}
                                        </div>
                                        {event.diagnosis && (
                                            <div className="text-[11px] text-slate-300 mb-1 italic">
                                                {event.diagnosis}
                                            </div>
                                        )}
                                        <div className="text-[11px] text-slate-400">
                                            {Object.entries(event.parametersAfter)
                                                .map(([k, v]) => `${k} → ${Number(v).toFixed(1)}`)
                                                .join(' · ')
                                            }
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Recommendations */}
                {suggestions.length > 0 && (
                    <div className="border-t border-slate-700">
                        <div className="px-4 py-2">
                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Lightbulb size={12} className="text-yellow-400" />
                                AI Recommendations ({suggestions.length})
                            </h4>
                            <div className="space-y-2">
                                {suggestions.map(suggestion => {
                                    const colors = TYPE_COLORS[suggestion.type];
                                    return (
                                        <div
                                            key={suggestion.id}
                                            className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className={`mt-0.5 flex-shrink-0 ${colors.iconColor}`}>
                                                    {SUGGESTION_ICON_MAP[suggestion.icon]}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-xs font-semibold ${colors.titleColor}`}>
                                                            {suggestion.title}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${colors.badge}`}>
                                                            {colors.badgeText}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                                        {suggestion.detail}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
