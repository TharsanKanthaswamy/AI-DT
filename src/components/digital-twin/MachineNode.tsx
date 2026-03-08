import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { AssetState, ASSETS } from '../../lib/assets';

interface MachineNodeProps {
    assetId: string;
    position: [number, number, number];
    assetState?: AssetState;
    isSelected: boolean;
    onSelect: (assetId: string) => void;
    isRunning: boolean;
    speed: number;
}

function getHealthColor(state: AssetState | undefined): string {
    if (!state) return '#ef4444';
    
    // Check for explicit warnings first
    const hasCriticalWarning = state.activeWarnings?.some(w => w.severity === 'critical') ?? false;
    const hasWarning = state.activeWarnings?.some(w => w.severity === 'warning') ?? false;
    
    if (hasCriticalWarning) return '#ef4444'; // Red for critical
    if (hasWarning) return '#eab308'; // Yellow for warnings
    
    // Fallback to efficiency score
    const efficiency = state.efficiency_score;
    if (efficiency === null || efficiency === undefined) return '#ef4444';
    if (efficiency > 0.7) return '#22c55e';
    if (efficiency > 0.4) return '#eab308';
    return '#ef4444';
}

const MachineNode: React.FC<MachineNodeProps> = ({
    assetId,
    position,
    assetState,
    isSelected,
    onSelect,
    isRunning,
    speed,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const accentMeshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const label = useMemo(() => {
        const asset = ASSETS.find(a => a.assetId === assetId);
        return asset?.label ?? assetId;
    }, [assetId]);

    const healthColor = getHealthColor(assetState);

    const hasCriticalWarning = assetState?.activeWarnings?.some(
        w => w.severity === 'critical'
    ) ?? false;

    // Spring animation for selection scale
    const { scale } = useSpring({
        scale: isSelected ? 1.35 : 1.0,
        config: { tension: 200, friction: 20 },
    });

    // Critical pulse animation
    useFrame((state) => {
        if (isRunning && groupRef.current) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * speed * 2) * 0.05;
        }

        // Critical pulse on accent mesh
        if (accentMeshRef.current) {
            const material = accentMeshRef.current.material as THREE.MeshStandardMaterial;
            if (hasCriticalWarning) {
                const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
                material.emissiveIntensity = 0.2 + pulse * 0.6;
            } else {
                material.emissiveIntensity = 0.3;
            }

            material.emissive = new THREE.Color(healthColor);
        }
    });

    const warnings = assetState?.activeWarnings?.slice(0, 3) ?? [];

    return (
        <animated.group
            ref={groupRef}
            position={position}
            scale={scale}
            onClick={(e) => { e.stopPropagation(); onSelect(assetId); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            {/* Machine Base */}
            <mesh position={[0, 1, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.5, 2, 2.5]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Machine Accent/Top — health colored */}
            <mesh ref={accentMeshRef} position={[0, 2.2, 0]} castShadow>
                <boxGeometry args={[2.2, 0.4, 2.2]} />
                <meshStandardMaterial
                    color={healthColor}
                    roughness={0.2}
                    metalness={0.1}
                    emissive={healthColor}
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Floating Label */}
            <Text
                position={[0, 3.5, 0]}
                fontSize={0.4}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                {label}
            </Text>

            {/* Status Light */}
            <mesh position={[0, 2.8, 1]} castShadow>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial
                    color={healthColor}
                    emissive={healthColor}
                    emissiveIntensity={2}
                />
            </mesh>

            {/* Warning Labels */}
            {warnings.map((warning, index) => (
                <Html
                    key={warning.id}
                    position={[0, 2.5 + index * 0.6, 0]}
                    center
                    distanceFactor={10}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            backgroundColor: warning.severity === 'critical' ? '#ef4444' : '#eab308',
                            color: warning.severity === 'critical' ? '#ffffff' : '#000000',
                            animation: warning.severity === 'critical' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                        }}
                    >
                        {warning.type}
                    </div>
                </Html>
            ))}

            {/* Hover Tooltip */}
            {hovered && (
                <Html position={[0, 4.5, 0]} center distanceFactor={10}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#f1f5f9',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        border: '1px solid #334155',
                        backdropFilter: 'blur(8px)',
                        width: '160px',
                        pointerEvents: 'none',
                    }}>
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}>
                            {label}
                        </div>
                        <div>RPM: {assetState?.rpm?.toFixed(0) ?? '—'}</div>
                        <div>Temp: {assetState?.process_temp?.toFixed(1) ?? '—'} K</div>
                        <div>Efficiency: {assetState?.efficiency_score != null ? `${(assetState.efficiency_score * 100).toFixed(1)}%` : '—'}</div>
                        <div>Warnings: {assetState?.activeWarnings?.length ?? 0}</div>
                    </div>
                </Html>
            )}
        </animated.group>
    );
};

export default MachineNode;
