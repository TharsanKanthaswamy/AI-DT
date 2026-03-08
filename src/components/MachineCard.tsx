import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Machine {
    id: string;
    name: string;
    icon: React.ReactNode;
    capacity: number;
    time: number;
    utilization: number;
}

interface MachineCardProps {
    machine: Machine;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 w-48 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-slate-100 rounded-full">{machine.icon}</div>
                <span className="text-xs font-bold text-slate-400">{machine.id}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1 leading-tight">{machine.name}</h3>
            <div className="text-xs text-slate-500 mb-3">
                Cap: {machine.capacity} UPH
            </div>

            <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                    <span>Utilization</span>
                    <span className="font-medium">{machine.utilization}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                        className={`h-1.5 rounded-full ${machine.utilization > 80 ? 'bg-orange-500' :
                                machine.utilization > 60 ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${machine.utilization}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default MachineCard;
