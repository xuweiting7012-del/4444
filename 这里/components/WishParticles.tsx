import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Wish } from '../types';

interface WishClusterProps {
  wish: Wish;
}

const WishCluster: React.FC<WishClusterProps> = ({ wish }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const particleCount = 240;
  
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const size = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      // Create a soft spherical cluster
      const r = Math.random() * 0.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      size[i] = 1.0 + Math.random() * 2.0;
    }
    return [pos, size];
  }, []);

  // Arc path configuration
  const startPos = new THREE.Vector3(0, -10, 5); // From roughly bottom center
  const endPos = new THREE.Vector3(0, 6.5, 0);   // To top star
  const controlPos = new THREE.Vector3(10, 0, 10); // Arc control point for "elegant curve"

  useFrame((state) => {
    if (!pointsRef.current) return;
    const now = state.clock.getElapsedTime();
    const progress = (now - wish.startTime) / 3.0; // 3 seconds flight
    const t = THREE.MathUtils.clamp(progress, 0, 1);

    // Quadratic Bezier Curve calculation
    const currentPos = new THREE.Vector3();
    currentPos.x = (1 - t) * (1 - t) * startPos.x + 2 * (1 - t) * t * controlPos.x + t * t * endPos.x;
    currentPos.y = (1 - t) * (1 - t) * startPos.y + 2 * (1 - t) * t * controlPos.y + t * t * endPos.y;
    currentPos.z = (1 - t) * (1 - t) * startPos.z + 2 * (1 - t) * t * controlPos.z + t * t * endPos.z;

    pointsRef.current.position.copy(currentPos);
    if (lightRef.current) lightRef.current.position.copy(currentPos);

    // Scaling and fade out
    const scale = t < 0.1 ? t * 10 : t > 0.9 ? (1 - t) * 10 : 1;
    pointsRef.current.scale.setScalar(scale);
    
    // Add internal cluster rotation
    pointsRef.current.rotation.y += 0.05;
    pointsRef.current.rotation.z += 0.03;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          color="#E1F5FE"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </points>
      <pointLight ref={lightRef} intensity={10} distance={10} color="#BBDEFB" />
    </group>
  );
};

interface WishParticlesProps {
  wishes: Wish[];
}

export const WishParticles: React.FC<WishParticlesProps> = ({ wishes }) => {
  return (
    <>
      {wishes.map((wish) => (
        <WishCluster key={wish.id} wish={wish} />
      ))}
    </>
  );
};