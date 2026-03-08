'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import FactoryOverview from '../components/FactoryOverview';
import OptimizationControls from '../components/OptimizationControls';
import ResultsDashboard from '../components/ResultsDashboard';
import ScheduleTimeline from '../components/ScheduleTimeline';
import UtilizationChart from '../components/UtilizationChart';

export default function Home() {
    const [selectedMode, setSelectedMode] = useState<'classical' | 'quantum'>('classical');
    const [isRunning, setIsRunning] = useState(false);
    const [resultsVisible, setResultsVisible] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const handleRunOptimization = () => {
        setIsRunning(true);
        setResultsVisible(false);

        // Simulate processing time
        setTimeout(() => {
            setIsRunning(false);
            setResultsVisible(true);
        }, 2000);
    };

    const toggleTheme = () => {
        // Ideally this would toggle a class on the document body
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans`}>
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded text-white">
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                                Smart Assembly Line Optimizer
                            </h1>
                            <p className="text-[10px] text-slate-500 font-medium tracking-wider">INDUSTRY 4.0 DEMO SUITE</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/digital-twin"
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm"
                        >
                            <MonitorSmartphone className="w-4 h-4" />
                            Launch 3D Digital Twin
                        </Link>

                        <span className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                            <MonitorSmartphone className="w-3 h-3" />
                            Demo Mode
                        </span>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Factory Configuration */}
                <section>
                    <FactoryOverview />
                </section>

                {/* Controls */}
                <section>
                    <OptimizationControls
                        selectedMode={selectedMode}
                        onModeChange={setSelectedMode}
                        onRunOptimization={handleRunOptimization}
                        isRunning={isRunning}
                    />
                </section>

                {/* Results Section - Conditionally Rendered */}
                {resultsVisible && (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">
                        <ResultsDashboard isVisible={resultsVisible} mode={selectedMode} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ScheduleTimeline isVisible={resultsVisible} mode={selectedMode} />
                            <UtilizationChart isVisible={resultsVisible} mode={selectedMode} />
                        </div>

                        {/* Detailed Bottleneck Analysis / Warning Panel */}
                        <div className={`p-4 rounded-lg border-l-4 shadow-sm ${selectedMode === 'classical' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'}`}>
                            <h4 className="font-bold flex items-center gap-2 mb-1">
                                {selectedMode === 'classical' ? '⚠️ CRITICAL BOTTLENECK DETECTED' : '⚠️ SYSTEM LOAD BALANCED'}
                            </h4>
                            <p className="text-sm">
                                {selectedMode === 'classical'
                                    ? 'Reflow Soldering Station (M-02) is operating at 98% capacity, causing upstream blockage at Component Placement.'
                                    : 'Workflow optimized. Reflow Soldering load reduced to manageable levels (92%) via quantum-inspired scheduling algorithms.'}
                            </p>
                        </div>
                    </section>
                )}

            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-8 mt-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="font-semibold text-slate-300 mb-2">Digital Twin Simulation Ready</p>
                    <p className="text-sm mb-4">Real-time IoT data integration and backend connectivity coming soon.</p>
                    <div className="text-xs text-slate-600">
                        © 2026 Smart Assembly Systems. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
