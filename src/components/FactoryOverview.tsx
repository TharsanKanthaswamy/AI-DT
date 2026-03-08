import React from 'react';
import { ArrowRight, Box, Cpu, Microscope, Package, Zap } from 'lucide-react';
import MachineCard from './MachineCard';

interface FactoryOverviewProps {
  // Static data in this demo, so no props needed really, but could accept machine status
}

const machines = [
  { id: 'M-01', name: 'Component Placement', icon: <Cpu className="w-6 h-6 text-blue-500" />, capacity: 120, time: 45, utilization: 78 },
  { id: 'M-02', name: 'Reflow Soldering', icon: <Zap className="w-6 h-6 text-orange-500" />, capacity: 100, time: 60, utilization: 85 },
  { id: 'M-03', name: 'Optical Inspection', icon: <Microscope className="w-6 h-6 text-purple-500" />, capacity: 140, time: 30, utilization: 65 },
  { id: 'M-04', name: 'Functional Testing', icon: <Box className="w-6 h-6 text-green-500" />, capacity: 110, time: 50, utilization: 70 },
  { id: 'M-05', name: 'Packaging Unit', icon: <Package className="w-6 h-6 text-yellow-500" />, capacity: 150, time: 25, utilization: 60 },
];

const FactoryOverview: React.FC<FactoryOverviewProps> = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">Factory Configuration & Workflow</h2>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto pb-4">
        {machines.map((machine, index) => (
          <div key={machine.id} className="flex items-center">
            <MachineCard machine={machine} />
            {index < machines.length - 1 && (
              <ArrowRight className="w-6 h-6 text-slate-400 mx-2 hidden md:block" />
            )}
            {index < machines.length - 1 && (
               <div className="md:hidden my-2">
                  <ArrowRight className="w-6 h-6 text-slate-400 rotate-90" />
               </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
          <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <span className="block font-medium text-slate-500">Total Machines</span>
              <span className="text-lg font-bold text-slate-800">5</span>
          </div>
          <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <span className="block font-medium text-slate-500">Production Stages</span>
              <span className="text-lg font-bold text-slate-800">5</span>
          </div>
           <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <span className="block font-medium text-slate-500">Est. Throughput</span>
              <span className="text-lg font-bold text-slate-800">85 UPH</span>
          </div>
           <div className="bg-slate-50 p-3 rounded border border-slate-100">
              <span className="block font-medium text-slate-500">Flow Type</span>
              <span className="text-lg font-bold text-slate-800">Linear / Serial</span>
          </div>
      </div>
    </div>
  );
};

export default FactoryOverview;
