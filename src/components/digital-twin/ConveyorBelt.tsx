'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AssetState, ASSETS } from '../../lib/assets';

interface ConveyorBeltProps {
    assetId: string;
    position: [number, number, number];
    length?: number;
    assetState?: AssetState;
    isSelected: boolean;
    onSelect: (id: string) => void;
    isRunning?: boolean;
    speed?: number;
}

const SEGMENT_COUNT = 8;

function getHealthColor(efficiency: number | null | undefined): string {
    if (efficiency === null || efficiency === undefined) return '#ef4444';
    if (efficiency > 0.7) return '#22c55e';
    if (efficiency > 0.4) return '#eab308';
    return '#ef4444';
}

const ConveyorBelt: React.FC<ConveyorBeltProps> = ({
    assetId,
    position,
    length = 2.8,
    assetState,
    isSelected,
    onSelect,
    isRunning = true,
}) => {
    const segmentRefs = useRef<(THREE.Mesh | null)[]>([]);
    const [hovered, setHovered] = React.useState(false);

    const label = useMemo(() => {
        const asset = ASSETS.find(a => a.assetId === assetId);
        return asset?.label ?? assetId;
    }, [assetId]);

    const healthColor = getHealthColor(assetState?.efficiency_score);

    useFrame((_, delta) => {
        if (!isRunning) return;
        const beltSpeed = (assetState?.rpm ?? 1500) / 1500;

        segmentRefs.current.forEach((seg) => {
            if (!seg) return;
            // Move segments along X axis (direction of production flow)
            seg.position.x += delta * beltSpeed * 1.8;
            if (seg.position.x > length / 2) {
                seg.position.x -= length;
            }
        });
    });

    const warnings = assetState?.activeWarnings?.slice(0, 2) ?? [];

    return (
        <group
            position={position}
            scale={isSelected ? [1.05, 1.05, 1.05] : [1, 1, 1]}
            onClick={(e) => { e.stopPropagation(); onSelect(assetId); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            {/* Left rail (along X axis, at -Z edge) */}
            <mesh position={[0, 0.35, -0.5]} castShadow>
                <boxGeometry args={[length, 0.06, 0.06]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Right rail (along X axis, at +Z edge) */}
            <mesh position={[0, 0.35, 0.5]} castShadow>
                <boxGeometry args={[length, 0.06, 0.06]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Belt surface (static base) */}
            <mesh position={[0, 0.38, 0]} receiveShadow>
                <boxGeometry args={[length, 0.05, 0.9]} />
                <meshStandardMaterial
                    color="#1e293b"
                    emissive={healthColor}
                    emissiveIntensity={0.06}
                />
            </mesh>

            {/* Animated belt slats — move along X */}
            {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
                <mesh
                    key={i}
                    ref={el => { segmentRefs.current[i] = el; }}
                    position={[
                        -length / 2 + (i * length / SEGMENT_COUNT),
                        0.42,
                        0,
                    ]}
                    castShadow
                >
                    <boxGeometry args={[0.18, 0.04, 0.85]} />
                    <meshStandardMaterial
                        color="#0f172a"
                        emissive={healthColor}
                        emissiveIntensity={0.18}
                    />
                </mesh>
            ))}

            {/* Support legs */}
            {([-length / 2 + 0.3, length / 2 - 0.3] as number[]).map((x, i) => (
                <group key={i} position={[x, 0, 0]}>
                    <mesh position={[0, 0.17, -0.4]} castShadow>
                        <cylinderGeometry args={[0.04, 0.04, 0.35, 6]} />
                        <meshStandardMaterial color="#475569" metalness={0.9} />
                    </mesh>
                    <mesh position={[0, 0.17, 0.4]} castShadow>
                        <cylinderGeometry args={[0.04, 0.04, 0.35, 6]} />
                        <meshStandardMaterial color="#475569" metalness={0.9} />
                    </mesh>
                </group>
            ))}

            {/* Status light */}
            <mesh position={[0, 0.7, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                    color={healthColor}
                    emissive={healthColor}
                    emissiveIntensity={1.5}
                    toneMapped={false}
                />
            </mesh>

            {/* Warning pills */}
            {warnings.map((w, i) => (
                <Html key={w.id} position={[0, 1.2 + i * 0.4, 0]} center>
                    <div style={{
                        background: w.severity === 'critical' ? '#ef4444' : '#eab308',
                        color: w.severity === 'critical' ? 'white' : 'black',
                        padding: '2px 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 'bold',
                        whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>
                        {w.type}
                    </div>
                </Html>
            ))}

            {/* Label */}
            <Html position={[0, 1.0, 0]} center>
                <div style={{
                    color: '#94a3b8', fontSize: 10, whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                }}>
                    {assetId.replace('-', ' ').toUpperCase()}
                </div>
            </Html>

            {/* Hover Tooltip */}
            {hovered && (
                <Html position={[0, 1.8, 0]} center>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#f1f5f9',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        border: '1px solid #334155',
                        width: '150px',
                        pointerEvents: 'none',
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
                        <div>Speed: {(((assetState?.rpm ?? 1500) / 1500) * 100).toFixed(0)}%</div>
                        <div>Efficiency: {assetState?.efficiency_score != null ? `${(assetState.efficiency_score * 100).toFixed(1)}%` : '—'}</div>
                        <div>Warnings: {assetState?.activeWarnings?.length ?? 0}</div>
                    </div>
                </Html>
            )}
        </group>
    );
};

export default ConveyorBelt;
