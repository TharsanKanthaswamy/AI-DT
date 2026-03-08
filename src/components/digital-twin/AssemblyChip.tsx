'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetState } from '../../lib/assets';

interface AssemblyChipProps {
    id: number;
    linePositions: [number, number, number][];
    assetStates: Record<string, AssetState | undefined>;
    isRunning: boolean;
    globalSpeed: number;
}

const MACHINE_XS = [-12.8, -6.4, 0, 6.4, 12.8];
const MACHINE_IDS = ['machine-1', 'machine-2', 'machine-3', 'machine-4', 'machine-5'];
const MACHINE_X_MAP: Record<string, number> = {
    'machine-1': -12.8,
    'machine-2': -6.4,
    'machine-3': 0,
    'machine-4': 6.4,
    'machine-5': 12.8,
};

const LINE_START_X = -16;
const LINE_END_X = 16;
const LINE_TOTAL = LINE_END_X - LINE_START_X;

// Each chip travels the full line independently with a phase offset
export default function AssemblyChip({
    id,
    assetStates,
    isRunning,
    globalSpeed,
}: AssemblyChipProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    // Stagger 5 chips evenly across the line
    const progressRef = useRef(id * (1.0 / 5));

    // The chip Y position: 1.2 on machines (on top), 0.52 on conveyors (belt surface)
    const getYForX = (x: number) => {
        const nearestMachine = MACHINE_XS.reduce((best, mx) =>
            Math.abs(x - mx) < Math.abs(x - best) ? mx : best, Infinity
        );
        const distToMachine = Math.abs(x - nearestMachine);
        if (distToMachine < 0.8) return 1.2; // on top of machine
        return 0.52; // on conveyor belt surface
    };

    useFrame((_, delta) => {
        if (!isRunning || !meshRef.current) return;

        // Base speed: traverse full line in ~20 seconds at speed 1.0
        const baseSpeed = globalSpeed * 0.05;

        // Check proximity to nearest machine
        const currentX = LINE_START_X + progressRef.current * LINE_TOTAL;
        const nearestMachine = MACHINE_XS.reduce((best, mx) =>
            Math.abs(currentX - mx) < Math.abs(currentX - best) ? mx : best, Infinity
        );
        const distToMachine = Math.abs(currentX - nearestMachine);

        let speed = baseSpeed;
        if (distToMachine < 1.0) {
            // Find which machine we're near
            const nearMachineId = MACHINE_IDS.find(mid =>
                Math.abs(currentX - (MACHINE_X_MAP[mid] ?? Infinity)) < 1.0
            );

            const machineState = nearMachineId ? assetStates[nearMachineId] : undefined;
            const hasFailure = machineState?.activeWarnings?.some(
                (w) => w.type === 'FAILURE'
            );
            const hasCritical = machineState?.activeWarnings?.some(
                (w) => w.severity === 'critical'
            );

            if (hasFailure) {
                speed = baseSpeed * 0.05; // near stop — machine in emergency
            } else if (hasCritical) {
                speed = baseSpeed * 0.15; // very slow — machine in recovery
            } else {
                speed = baseSpeed * 0.30; // normal processing slow
            }
        }

        progressRef.current += delta * speed;
        if (progressRef.current > 1.0) progressRef.current = 0.0;

        const newX = LINE_START_X + progressRef.current * LINE_TOTAL;
        const newY = getYForX(newX);

        meshRef.current.position.x = newX;
        meshRef.current.position.y = newY;
        meshRef.current.position.z = 0;

        // Rotate slightly when on conveyor, stop rotating on machine
        if (distToMachine > 1.0) {
            meshRef.current.rotation.y += delta * 1.5;
        }
    });

    return (
        <mesh ref={meshRef} castShadow>
            {/* PCB chip geometry: flat green square */}
            <boxGeometry args={[0.25, 0.06, 0.2]} />
            <meshStandardMaterial
                color="#065f46"
                emissive="#22c55e"
                emissiveIntensity={0.6}
                metalness={0.3}
                roughness={0.7}
            />
        </mesh>
    );
}
