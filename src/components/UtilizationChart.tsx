'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface UtilizationChartProps {
    isVisible: boolean;
    mode: 'classical' | 'quantum';
}

const UtilizationChart: React.FC<UtilizationChartProps> = ({ isVisible, mode }) => {
    if (!isVisible) return null;

    const isQuantum = mode === 'quantum';

    const data = [
        { name: 'Placement', classical: 78, quantum: 88, fill: '#3b82f6' },
        { name: 'Reflow', classical: 85, quantum: 92, fill: '#f97316' },
        { name: 'Inspection', classical: 65, quantum: 85, fill: '#a855f7' },
        { name: 'Testing', classical: 70, quantum: 82, fill: '#22c55e' },
        { name: 'Packaging', classical: 60, quantum: 75, fill: '#eab308' },
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-96 animate-in fade-in duration-800">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Machine Utilization Comparison</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        domain={[0, 100]}
                        unit="%"
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar
                        dataKey={isQuantum ? "quantum" : "classical"}
                        name="Utilization"
                        radius={[4, 4, 0, 0]}
                        animationDuration={1500}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UtilizationChart;
