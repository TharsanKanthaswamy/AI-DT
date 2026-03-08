import React from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, Clock, BarChart3, Activity } from 'lucide-react';

interface ResultsDashboardProps {
    isVisible: boolean;
    mode: 'classical' | 'quantum';
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ isVisible, mode }) => {
    if (!isVisible) return null;

    const isQuantum = mode === 'quantum';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-6 rounded-lg shadow-md border-l-4 ${isQuantum ? 'bg-purple-50 border-purple-600' : 'bg-white border-blue-500'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className={`w-6 h-6 ${isQuantum ? 'text-purple-600' : 'text-blue-500'}`} />
                        Optimization Results: {isQuantum ? 'Quantum-Inspired' : 'Classical Algorithm'}
                    </h2>
                    {isQuantum && (
                        <span className="flex items-center gap-1 text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                            <TrendingUp className="w-4 h-4" />
                            +10.6% Performance
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Metric 1 */}
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <Clock className="w-4 h-4" /> Production Makespan
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{isQuantum ? '465 min' : '520 min'}</div>
                        <div className="text-xs text-slate-400 mt-1">Total run time</div>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <Activity className="w-4 h-4" /> Machine Utilization
                        </div>
                        <div className={`text-2xl font-bold ${isQuantum ? 'text-green-600' : 'text-slate-800'}`}>{isQuantum ? '92%' : '82%'}</div>
                        <div className="text-xs text-slate-400 mt-1">Global average</div>
                    </div>

                    {/* Metric 3 */}
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <CheckCircle2 className="w-4 h-4" /> Throughput Efficiency
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{isQuantum ? 'Improved' : 'Baseline'}</div>
                        <div className="text-xs text-slate-400 mt-1">vs Standard Flow</div>
                    </div>

                    {/* Metric 4 */}
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <AlertTriangle className="w-4 h-4" /> Bottleneck Risk
                        </div>
                        <div className={`text-2xl font-bold ${isQuantum ? 'text-yellow-600' : 'text-red-500'}`}>{isQuantum ? 'Reduced' : 'High'}</div>
                        <div className="text-xs text-slate-400 mt-1">{isQuantum ? 'Balanced Load' : 'Soldering Station'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsDashboard;
