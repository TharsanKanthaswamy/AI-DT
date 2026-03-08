export const ASSETS = [
    { assetId: 'conveyor-1', label: 'Conveyor Belt 1', type: 'conveyor', machineType: 'M' },
    { assetId: 'machine-1', label: 'CNC Machine 1', type: 'machine', machineType: 'M' },
    { assetId: 'conveyor-2', label: 'Conveyor Belt 2', type: 'conveyor', machineType: 'L' },
    { assetId: 'machine-2', label: 'CNC Machine 2', type: 'machine', machineType: 'L' },
    { assetId: 'conveyor-3', label: 'Conveyor Belt 3', type: 'conveyor', machineType: 'M' },
    { assetId: 'machine-3', label: 'CNC Machine 3', type: 'machine', machineType: 'H' },
    { assetId: 'conveyor-4', label: 'Conveyor Belt 4', type: 'conveyor', machineType: 'L' },
    { assetId: 'machine-4', label: 'CNC Machine 4', type: 'machine', machineType: 'L' },
    { assetId: 'conveyor-5', label: 'Conveyor Belt 5', type: 'conveyor', machineType: 'H' },
    { assetId: 'machine-5', label: 'CNC Machine 5', type: 'machine', machineType: 'H' },
    { assetId: 'pcb-line-1', label: 'PCB Assembly', type: 'pcb', machineType: 'H' },
] as const;

export type AssetId = typeof ASSETS[number]['assetId'];

export interface Warning {
    id: string;
    type: string;
    message: string;
    severity: 'critical' | 'warning';
    assetId: string;
    timestamp: number;
    probability?: number;
    confidence?: 'low' | 'medium' | 'high';
}

export interface AssetState {
    assetId: string;
    assetType: string;
    machineType: string;
    air_temp: number;
    process_temp: number;
    rpm: number;
    torque: number;
    tool_wear: number;
    energy_kwh: number;
    output_units: number;
    uph: number;
    efficiency_score: number | null;
    activeWarnings: Warning[];
    probabilities: Record<string, number>;
}
