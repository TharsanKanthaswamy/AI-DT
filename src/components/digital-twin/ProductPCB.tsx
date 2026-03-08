'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { AssetState, ASSETS } from '../../lib/assets';

interface ProductPCBProps {
    assetId: string;
    assetState?: AssetState;
    isSelected: boolean;
    onSelect: (assetId: string) => void;
    isRunning: boolean;
    speed: number;
}

function getHealthColor(efficiency: number | null | undefined): string {
    if (efficiency === null || efficiency === undefined) return '#ef4444';
    if (efficiency > 0.7) return '#22c55e';
    if (efficiency > 0.4) return '#eab308';
    return '#ef4444';
}

const ProductPCB: React.FC<ProductPCBProps> = ({
    assetId,
    assetState,
    isSelected,
    onSelect,
}) => {
    const label = useMemo(() => {
        const asset = ASSETS.find(a => a.assetId === assetId);
        return asset?.label ?? 'PCB Assembly';
    }, [assetId]);

    const healthColor = getHealthColor(assetState?.efficiency_score);
    const warnings = assetState?.activeWarnings?.slice(0, 2) ?? [];

    // Table leg positions
    const legPositions: [number, number, number][] = [
        [-0.9, 0, -0.6],
        [0.9, 0, -0.6],
        [-0.9, 0, 0.6],
        [0.9, 0, 0.6],
    ];

    return (
        <group
            onClick={(e) => { e.stopPropagation(); onSelect(assetId); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            scale={isSelected ? 1.15 : 1}
        >
            {/* Table base — thick lower platform */}
            <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.2, 0.1, 1.6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
            </mesh>

            {/* Table legs */}
            {legPositions.map((p, i) => (
                <mesh key={i} position={p} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
                    <meshStandardMaterial color="#334155" metalness={0.9} />
                </mesh>
            ))}

            {/* Work surface */}
            <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.0, 0.08, 1.4]} />
                <meshStandardMaterial
                    color="#0f172a"
                    emissive={healthColor}
                    emissiveIntensity={0.1}
                />
            </mesh>

            {/* PCB boards being processed (3 small green boards on surface) */}
            {[-0.6, 0, 0.6].map((x, i) => (
                <mesh key={i} position={[x, 0.92, 0]} castShadow>
                    <boxGeometry args={[0.45, 0.04, 0.8]} />
                    <meshStandardMaterial
                        color="#065f46"
                        emissive="#22c55e"
                        emissiveIntensity={0.3}
                    />
                </mesh>
            ))}

            {/* Status light */}
            <mesh position={[0, 1.4, 0]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial
                    color={healthColor}
                    emissive={healthColor}
                    emissiveIntensity={1.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Warning labels */}
            {warnings.map((w, i) => (
                <Html key={w.id} position={[0, 1.9 + i * 0.45, 0]} center distanceFactor={10}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: w.severity === 'critical' ? '#ef4444' : '#eab308',
                            color: w.severity === 'critical' ? 'white' : 'black',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}
                    >
                        {w.type}
                    </div>
                </Html>
            ))}

            {/* Label */}
            <Html position={[0, 2.1, 0]} center distanceFactor={10}>
                <div style={{
                    color: 'white', fontSize: 11, whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    pointerEvents: 'none',
                }}>
                    {label}
                </div>
            </Html>
        </group>
    );
};

export default ProductPCB;
