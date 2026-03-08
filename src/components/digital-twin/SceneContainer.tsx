'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import MachineNode from './MachineNode';
import ConveyorBelt from './ConveyorBelt';
import ProductPCB from './ProductPCB';
import AssemblyChip from './AssemblyChip';
import { AssetState, ASSETS } from '../../lib/assets';

// ── Position map — single straight line along X axis ────────
const LINE_POSITIONS: Record<string, [number, number, number]> = {
    'conveyor-1': [-16, 0, 0],
    'machine-1': [-12.8, 0, 0],
    'conveyor-2': [-9.6, 0, 0],
    'machine-2': [-6.4, 0, 0],
    'conveyor-3': [-3.2, 0, 0],
    'machine-3': [0, 0, 0],
    'conveyor-4': [3.2, 0, 0],
    'machine-4': [6.4, 0, 0],
    'conveyor-5': [9.6, 0, 0],
    'machine-5': [12.8, 0, 0],
    'pcb-line-1': [16, 0, 0],
};

// All station positions in order (used by AssemblyChip)
const LINE_X_POSITIONS: [number, number, number][] = [
    [-16, 0, 0],
    [-12.8, 0, 0],
    [-9.6, 0, 0],
    [-6.4, 0, 0],
    [-3.2, 0, 0],
    [0, 0, 0],
    [3.2, 0, 0],
    [6.4, 0, 0],
    [9.6, 0, 0],
    [12.8, 0, 0],
    [16, 0, 0],
];

interface SceneContainerProps {
    isRunning: boolean;
    simulationSpeed: number;
    assetStates: Record<string, AssetState>;
    selectedAssetId: string | null;
    setSelectedAssetId: (id: string | null) => void;
    onDismissWarning: (assetId: string, warningId: string) => void;
}

function SceneContent({
    isRunning,
    simulationSpeed,
    assetStates,
    selectedAssetId,
    setSelectedAssetId,
}: Omit<SceneContainerProps, 'onDismissWarning'>) {

    return (
        <group>
            {/* ── Lighting ────────────────────────────────────── */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 15, 10]} intensity={0.9} castShadow />
            <directionalLight position={[-5, 8, -5]} intensity={0.3} />
            <pointLight position={[0, 10, 0]} intensity={0.4} distance={40} />

            {/* ── Stars + Fog ─────────────────────────────────── */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <fog attach="fog" args={['#0f172a', 20, 60]} />

            {/* ── Static floor — not an asset, not interactive ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[60, 30]} />
                <meshStandardMaterial color="#0f172a" metalness={0.1} roughness={0.9} />
            </mesh>

            {/* ── Production Line — alternating CB → CNC → ... → PCB ── */}
            {ASSETS.map(asset => {
                const position = LINE_POSITIONS[asset.assetId] ?? [0, 0, 0];
                const state = assetStates[asset.assetId];

                if (asset.type === 'machine') {
                    return (
                        <MachineNode
                            key={asset.assetId}
                            assetId={asset.assetId}
                            position={position}
                            assetState={state}
                            isSelected={selectedAssetId === asset.assetId}
                            onSelect={setSelectedAssetId}
                            isRunning={isRunning}
                            speed={simulationSpeed}
                        />
                    );
                }
                if (asset.type === 'conveyor') {
                    return (
                        <ConveyorBelt
                            key={asset.assetId}
                            assetId={asset.assetId}
                            position={position}
                            length={2.8}
                            assetState={state}
                            isSelected={selectedAssetId === asset.assetId}
                            onSelect={setSelectedAssetId}
                            isRunning={isRunning}
                            speed={simulationSpeed}
                        />
                    );
                }
                if (asset.type === 'pcb') {
                    return (
                        <group key={asset.assetId} position={position}>
                            <ProductPCB
                                assetId={asset.assetId}
                                assetState={state}
                                isSelected={selectedAssetId === asset.assetId}
                                onSelect={setSelectedAssetId}
                                isRunning={isRunning}
                                speed={simulationSpeed}
                            />
                        </group>
                    );
                }
                return null;
            })}

            {/* ── Assembly Chips — 5 staggered green PCBs ────── */}
            {[0, 1, 2, 3, 4].map(id => (
                <AssemblyChip
                    key={id}
                    id={id}
                    linePositions={LINE_X_POSITIONS}
                    assetStates={assetStates}
                    isRunning={isRunning}
                    globalSpeed={simulationSpeed}
                />
            ))}
        </group>
    );
}

export default function SceneContainer(props: SceneContainerProps) {
    return (
        <Canvas shadows className="w-full h-full">
            <PerspectiveCamera makeDefault position={[0, 12, 22]} fov={75} />
            <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.2} />

            <SceneContent
                isRunning={props.isRunning}
                simulationSpeed={props.simulationSpeed}
                assetStates={props.assetStates}
                selectedAssetId={props.selectedAssetId}
                setSelectedAssetId={props.setSelectedAssetId}
            />
        </Canvas>
    );
}
