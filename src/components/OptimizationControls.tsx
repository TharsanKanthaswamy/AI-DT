import React from 'react';
import { Play, Settings2, Sliders } from 'lucide-react';

interface OptimizationControlsProps {
    onRunOptimization: () => void;
    selectedMode: 'classical' | 'quantum';
    onModeChange: (mode: 'classical' | 'quantum') => void;
    isRunning: boolean;
}

const OptimizationControls: React.FC<OptimizationControlsProps> = ({
    onRunOptimization,
    selectedMode,
    onModeChange,
    isRunning
}) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-5 h-5 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-800">Optimization Control Panel</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Select Optimization Strategy:</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedMode === 'classical' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                            onClick={() => onModeChange('classical')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-800">Classical Optimization</span>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMode === 'classical' ? 'border-blue-600' : 'border-slate-300'}`}>
                                    {selectedMode === 'classical' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Standard heuristic-based scheduling. Effective for low-complexity lines but prone to local optima.</p>
                        </div>

                        <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedMode === 'quantum' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}
                            onClick={() => onModeChange('quantum')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-800">Quantum-Inspired Optimization</span>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMode === 'quantum' ? 'border-purple-600' : 'border-slate-300'}`}>
                                    {selectedMode === 'quantum' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Advanced annealing algorithms simulating quantum tunneling to escape local minima and find global optima.</p>
                            <span className="inline-block mt-2 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">EXPERIMENTAL</span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto flex items-end">
                    <button
                        onClick={onRunOptimization}
                        disabled={isRunning}
                        className={`
              w-full md:w-auto px-8 py-4 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
              ${isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-95'}
            `}
                    >
                        {isRunning ? (
                            <>
                                <Settings2 className="w-5 h-5 animate-spin" />
                                Optimizing...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" />
                                Generate Optimal Plan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OptimizationControls;
