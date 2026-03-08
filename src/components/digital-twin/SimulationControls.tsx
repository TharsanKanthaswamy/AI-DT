import React from 'react';
import { Play, Pause, RotateCcw, Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SimulationControlsProps {
    isRunning: boolean;
    setIsRunning: (val: boolean) => void;
    simulationSpeed: number;
    setSimulationSpeed: (val: number) => void;
    activeMode: 'classical' | 'quantum';
    setActiveMode: (val: 'classical' | 'quantum') => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
    isRunning,
    setIsRunning,
    simulationSpeed,
    setSimulationSpeed,
    activeMode,
    setActiveMode
}) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">

            {/* Top Bar */}
            <div className="flex justify-between items-start pointer-events-auto">
                <Link href="/" className="bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-colors border border-slate-700">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <div className="bg-slate-900/80 backdrop-blur text-white p-4 rounded-xl border border-slate-700 w-64">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-blue-400" /> Throughput
                            </div>
                            <span className="font-mono font-bold">{Math.floor(simulationSpeed * 120)} UPH</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-300">Active Units</div>
                            <span className="font-mono font-bold text-green-400">12</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-300">Efficiency</div>
                            <span className={`font-mono font-bold ${activeMode === 'quantum' ? 'text-purple-400' : 'text-yellow-400'}`}>
                                {activeMode === 'quantum' ? '98.5%' : '84.2%'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="pointer-events-auto self-center bg-slate-900/90 backdrop-blur text-white p-4 rounded-2xl border border-slate-700 flex flex-col gap-4 w-full max-w-2xl shadow-2xl">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsRunning(!isRunning)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRunning ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        >
                            {isRunning ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 pl-1" />}
                        </button>

                        <button
                            onClick={() => { setIsRunning(false); }}
                            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => { setActiveMode('classical'); setSimulationSpeed(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeMode === 'classical' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Classical Flow
                        </button>
                        <button
                            onClick={() => { setActiveMode('quantum'); setSimulationSpeed(1.5); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeMode === 'quantum' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Quantum-Inspired
                            {activeMode !== 'quantum' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Simulation Speed: {simulationSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={simulationSpeed}
                        onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

            </div>
        </div>
    );
};

export default SimulationControls;
