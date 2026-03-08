'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Radio, Clock, Zap, ZapOff } from 'lucide-react';
import SceneContainer from '../../components/digital-twin/SceneContainer';
import SimulationControls from '../../components/digital-twin/SimulationControls';
import AssetDetailPanel from '../../components/digital-twin/AssetDetailPanel';
import AIThinkingBanner from '../../components/digital-twin/AIThinkingBanner';
import { useWebSocket } from '../../lib/useWebSocket';

export default function DigitalTwinPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [activeMode, setActiveMode] = useState<'classical' | 'quantum'>('classical');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState('');

    const {
        assetStates,
        connectionStatus,
        dismissWarning,
        requestLogs,
        logs,
        recoveryEvents,
        aiThinking,
        autoOptimizationEnabled,
    } = useWebSocket();

    // Update clock every second
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Request logs for selected asset
    useEffect(() => {
        if (selectedAssetId) {
            requestLogs(selectedAssetId, 20);
        }
    }, [selectedAssetId, requestLogs]);

    // Periodically refresh logs for sparkline
    useEffect(() => {
        if (!selectedAssetId) return;
        const interval = setInterval(() => {
            requestLogs(selectedAssetId, 20);
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedAssetId, requestLogs]);

    // Total active warnings
    const totalWarnings = useMemo(() =>
        Object.values(assetStates).reduce(
            (sum, s) => sum + (s.activeWarnings?.length ?? 0),
            0
        ),
        [assetStates]
    );

    // Efficiency history for selected asset's sparkline
    const efficiencyHistory = useMemo(() => {
        if (!selectedAssetId || !logs[selectedAssetId]) return [];
        const assetLogs = logs[selectedAssetId] as Array<{ efficiency_score?: number }>;
        return assetLogs
            .slice(0, 20)
            .reverse()
            .map(l => l.efficiency_score ?? 0);
    }, [selectedAssetId, logs]);

    const selectedState = selectedAssetId ? assetStates[selectedAssetId] : undefined;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-900">

            {/* Top Status Bar */}
            <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Left: Connection status */}
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${autoOptimizationEnabled
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                            {autoOptimizationEnabled ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
                            {autoOptimizationEnabled ? 'Auto-Recovery Active' : 'Monitoring Only'}
                        </span>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${connectionStatus === 'connected'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : connectionStatus === 'connecting'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {connectionStatus === 'connected' ? (
                                <Wifi className="w-3 h-3" />
                            ) : (
                                <WifiOff className="w-3 h-3" />
                            )}
                            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                        </span>
                    </div>

                    {/* Center: Warnings */}
                    <div>
                        {totalWarnings > 0 && (
                            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 backdrop-blur-md animate-pulse">
                                <Radio className="w-3 h-3" />
                                {totalWarnings} Active Warning{totalWarnings !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Right: Clock */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 text-slate-300 text-xs font-mono border border-slate-700 backdrop-blur-md">
                        <Clock className="w-3 h-3" />
                        {currentTime}
                    </div>
                </div>
            </div>

            {/* AI Thinking Banner */}
            <AIThinkingBanner aiThinking={aiThinking} />

            {/* 3D Scene Layer */}
            <SceneContainer
                isRunning={isRunning}
                simulationSpeed={simulationSpeed}
                assetStates={assetStates}
                selectedAssetId={selectedAssetId}
                setSelectedAssetId={setSelectedAssetId}
                onDismissWarning={dismissWarning}
            />

            {/* Asset Detail Panel */}
            {selectedAssetId && (
                <AssetDetailPanel
                    assetState={selectedState}
                    onClose={() => setSelectedAssetId(null)}
                    onDismissWarning={dismissWarning}
                    efficiencyHistory={efficiencyHistory}
                    recoveryEvents={recoveryEvents}
                />
            )}

            {/* UI Overlay Layer */}
            <SimulationControls
                isRunning={isRunning}
                setIsRunning={setIsRunning}
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
                activeMode={activeMode}
                setActiveMode={setActiveMode}
            />
        </div>
    );
}
