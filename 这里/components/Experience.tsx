import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stars, ContactShadows, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { TreeState, Wish } from '../types';
import MorphingTree from './MorphingTree';
import { WishParticles } from './WishParticles';
import * as THREE from 'three';

interface ExperienceProps {
  treeState: TreeState;
  wishes: Wish[];
}

const MovingLights = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const blueLightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 0.5) * 15;
      lightRef.current.position.z = Math.cos(t * 0.5) * 15;
      lightRef.current.intensity = 3 + Math.sin(t * 2) * 1; 
    }
    if (blueLightRef.current) {
      blueLightRef.current.position.x = Math.sin(t * 0.3 + Math.PI) * 20;
      blueLightRef.current.intensity = 2 + Math.cos(t * 1.5) * 1;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={[10, 5, 10]} color="#ffffff" distance={40} decay={2} />
      <pointLight ref={blueLightRef} position={[-10, 10, -10]} color="#4fc3f7" distance={40} decay={2} />
    </>
  );
};

const Experience: React.FC<ExperienceProps> = ({ treeState, wishes }) => {
  return (
    <>
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={40}
        dampingFactor={0.05}
        autoRotate={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />

      <color attach="background" args={['#050b14']} />
      <fogExp2 attach="fog" args={['#050b14', 0.02]} />

      <Environment preset="city" environmentIntensity={0.5} blur={0.6} />
      
      <ambientLight intensity={0.1} color="#001133" />
      
      <MovingLights />
      
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.6} 
        penumbra={1} 
        intensity={2} 
        color="#e0f7fa" 
        castShadow 
      />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      
      <Sparkles 
        count={8000}
        scale={[80, 60, 80]}
        size={8}
        speed={1.2}
        opacity={0.9}
        color="#FFFFFF"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#050b14"
          roughness={0.1}
          metalness={0.6}
        />
      </mesh>
      
      <ContactShadows 
        position={[0, -6.4, 0]} 
        opacity={0.6} 
        scale={20} 
        blur={2.5} 
        far={4.5} 
        color="#000000" 
      />

      <MorphingTree treeState={treeState} />
      
      {/* Render the flying wishes */}
      <WishParticles wishes={wishes} />

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.9} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};

export default Experience;