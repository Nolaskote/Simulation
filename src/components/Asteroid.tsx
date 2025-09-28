import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { keplerianToCartesian, KeplerianElements, NEOData } from '../utils/orbitalMath';
import { AU_TO_UNITS } from '../utils/constants';

interface AsteroidProps {
  neo: NEOData;
  time: number;
  scale?: number;
  onHover?: (neo: NEOData | undefined) => void;
  onClick?: (neo: NEOData) => void;
  haloEnabled?: boolean;
}

export default function Asteroid({ neo, time, scale = 1, onHover, onClick, haloEnabled = true }: AsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convertir datos de string a números y crear elementos keplerianos
  const keplerianElements: KeplerianElements = useMemo(() => ({
    a: parseFloat(neo.a),
    e: parseFloat(neo.e),
    i: parseFloat(neo.i),
    Omega: parseFloat(neo.Omega),
    omega: parseFloat(neo.omega),
    M: parseFloat(neo.M),
    period: parseFloat(neo.period)
  }), [neo]);

  // Calcular posición actual
  const position = useMemo(() => {
    return keplerianToCartesian(keplerianElements, time);
  }, [keplerianElements, time]);

  // Rotación lenta del asteroide
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  // Determinar tamaño y color
  const size = useMemo(() => {
    if (neo.type === 'PHA') {
      return 0.08 * scale; // PHAs más visibles
    }
    return 0.05 * scale; // NEOs más pequeños
  }, [neo.type, scale]);

  const color = useMemo(() => {
    if (neo.type === 'PHA') {
      return '#ff4444'; // Rojo para PHAs
    }
    return '#888888'; // Gris para NEOs
  }, [neo.type]);

  return (
    <group position={[position.x * AU_TO_UNITS, position.y * AU_TO_UNITS, position.z * AU_TO_UNITS]}>
      <Sphere
        ref={meshRef}
        args={[size, 8, 6]}
        onPointerEnter={() => onHover?.(neo)}
        onPointerOut={() => onHover?.(undefined)}
        onClick={() => onClick?.(neo)}
      >
        <meshStandardMaterial
          color={color}
          emissive={neo.type === 'PHA' ? '#aa2222' : '#333333'}
          emissiveIntensity={neo.type === 'PHA' ? 0.9 : 0.4}
          roughness={0.65}
          metalness={0.2}
        />
      </Sphere>
      {haloEnabled && (
        <mesh>
          <sphereGeometry args={[size * 4.0, 16, 12]} />
          <meshBasicMaterial
            color={neo.type === 'PHA' ? '#ff2222' : '#f0f0f0'}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
