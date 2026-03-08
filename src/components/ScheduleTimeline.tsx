import React from 'react';

interface ScheduleTimelineProps {
    isVisible: boolean;
    mode: 'classical' | 'quantum';
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ isVisible, mode }) => {
    if (!isVisible) return null;

    const isQuantum = mode === 'quantum';

    // Mock data for scheduling blocks
    const schedules = [
        {
            machine: 'M-01 Placement', jobs: [
                { start: 0, duration: 45, color: 'bg-blue-400' },
                { start: 50, duration: 40, color: 'bg-blue-400' },
                { start: 95, duration: 42, color: 'bg-blue-400' },
                { start: 140, duration: 38, color: 'bg-blue-400' }
            ]
        },
        {
            machine: 'M-02 Reflow', jobs: [
                { start: 45, duration: 60, color: 'bg-orange-400' },
                { start: 110, duration: 55, color: 'bg-orange-400' },
                { start: 170, duration: 52, color: 'bg-orange-400' },
            ]
        },
        {
            machine: 'M-03 Inspection', jobs: [
                { start: 105, duration: 30, color: 'bg-purple-400' },
                { start: 165, duration: 28, color: 'bg-purple-400' },
                { start: 222, duration: 25, color: 'bg-purple-400' },
            ]
        },
        {
            machine: 'M-04 Testing', jobs: [
                { start: 135, duration: 50, color: 'bg-green-400' },
                { start: 195, duration: 48, color: 'bg-green-400' },
                { start: 250, duration: 45, color: 'bg-green-400' },
            ]
        },
        {
            machine: 'M-05 Packaging', jobs: [
                { start: 185, duration: 25, color: 'bg-yellow-400' },
                { start: 245, duration: 24, color: 'bg-yellow-400' },
                { start: 300, duration: 22, color: 'bg-yellow-400' },
            ]
        },
    ];

    // Adjust durations for quantum mode (make them shorter/tighter)
    const adjustedSchedules = isQuantum ? schedules.map(machine => ({
        ...machine,
        jobs: machine.jobs.map(job => ({
            ...job,
            start: Math.floor(job.start * 0.9),
            duration: Math.floor(job.duration * 0.9)
        }))
    })) : schedules;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 animate-in fade-in duration-700">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Production Schedule Visualization ({isQuantum ? 'Quantum-Optimized' : 'Baseline'})</h3>

            <div className="relative border-t border-b border-slate-200 py-4 overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Time labels */}
                    <div className="flex justify-between text-xs text-slate-400 mb-2 pl-24">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                            <span key={h} className="w-12 text-center">{h}h</span>
                        ))}
                    </div>

                    {adjustedSchedules.map((schedule, idx) => (
                        <div key={idx} className="flex items-center mb-3 group">
                            <div className="w-24 text-xs font-bold text-slate-600 truncate pr-2">{schedule.machine}</div>
                            <div className="flex-1 h-8 bg-slate-50 relative rounded border border-slate-100/50">
                                {schedule.jobs.map((job, jIdx) => (
                                    <div
                                        key={jIdx}
                                        className={`absolute top-1 bottom-1 rounded-sm shadow-sm opacity-90 hover:opacity-100 transition-all ${job.color}`}
                                        style={{
                                            left: `${job.start / 4}px`,
                                            width: `${job.duration / 4}px`
                                        }}
                                        title={`Start: ${job.start}m, Dur: ${job.duration}m`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-2 text-xs text-slate-400 text-right italic">
                * Mock schedule data for demonstration
            </div>
        </div>
    );
};

export default ScheduleTimeline;
