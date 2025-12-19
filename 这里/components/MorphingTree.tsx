import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Extrude } from '@react-three/drei';
import { TreeState, ParticleData } from '../types';

interface MorphingTreeProps {
  treeState: TreeState;
}

// --- Helpers ---

const randomInSphere = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

// Generate text positions using a canvas - Optimized for Thin/Sharp text
const generateTextPositions = (count: number, text: string): THREE.Vector3[] => {
  const canvas = document.createElement('canvas');
  const width = 2048; // Higher resolution for sharper sampling
  const height = 1024;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#FFFFFF';
  // Use normal weight (not bold) and larger font size for cleaner edges
  ctx.font = 'normal 80px Arial, Helvetica, sans-serif'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = text.split('\n');
  const lineHeight = 110; // Spacing between lines
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, height / 2 + (i - (lines.length-1)/2) * lineHeight);
  });

  const imageData = ctx.getImageData(0, 0, width, height);
  const validPoints: THREE.Vector3[] = [];

  // Sampling step
  const step = 6; 
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (imageData.data[index] > 128) {
        // Map to world units. Adjusted scale for the larger canvas
        const scale = 0.025; 
        const posX = (x - width / 2) * scale;
        const posY = -(y - height / 2) * scale;
        validPoints.push(new THREE.Vector3(posX, posY, 0));
      }
    }
  }

  const result: THREE.Vector3[] = [];
  if (validPoints.length === 0) return Array(count).fill(new THREE.Vector3(0,0,0));

  for (let i = 0; i < count; i++) {
    const p = validPoints[i % validPoints.length];
    // Minimal XY jitter to keep text sharp and thin
    // More Z jitter to prevent z-fighting and give 3D volume
    result.push(new THREE.Vector3(
      p.x + (Math.random() - 0.5) * 0.05,
      p.y + (Math.random() - 0.5) * 0.05,
      p.z + (Math.random() - 0.5) * 0.5 
    ));
  }
  return result;
};

// --- Sub-components ---

const FivePointedStar = ({ isVisible }: { isVisible: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.0;
    const innerRadius = 0.4;
    const numPoints = 5;
    
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i * Math.PI) / numPoints;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.sin(angle) * radius;
      const y = Math.cos(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.2;

    // Check camera distance for explosion effect
    const dist = state.camera.position.length();
    const explodeStart = 18;
    const explodeEnd = 4;
    const explodeFactor = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(dist, explodeStart, explodeEnd, 0, 1),
      0, 1
    );

    // Hide when exploded
    const targetScale = isVisible ? 1 : 0;
    const finalScale = targetScale * (1 - explodeFactor);
    
    groupRef.current.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.05);
  });

  return (
    <group ref={groupRef} position={[0, 6.5, 0]}>
      <Extrude args={[starShape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }]}>
        <meshStandardMaterial 
          color="#BBDEFB" 
          emissive="#BBDEFB" // Light Ice Blue
          emissiveIntensity={3.0}
          roughness={0.1}
          metalness={0.9}
        />
      </Extrude>
      
      {/* Point light matching the Star */}
      <pointLight intensity={4.0} distance={25} color="#BBDEFB" decay={2} />
    </group>
  );
};

const RibbonWithStars = ({ isVisible }: { isVisible: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.InstancedMesh>(null);
  
  const { curve, starPositions } = useMemo(() => {
    const points = [];
    const height = 15; 
    const turns = 4.5; 
    const radiusBase = 11; // Wider base, loose ribbon
    const yStart = -height / 2;
    const pointCount = 200;

    for (let i = 0; i <= pointCount; i++) {
      const t = i / pointCount;
      const angle = t * Math.PI * 2 * turns;
      const y = yStart + t * height;
      
      // Radius loosely follows cone but stays further out
      const r = (radiusBase * (1 - t * 0.9)) + 4.0; 
      
      // Add significant waviness
      const waveX = Math.sin(t * 15) * 2.5;
      const waveY = Math.cos(t * 10) * 1.5;
      const waveZ = Math.sin(t * 12) * 2.5;

      points.push(new THREE.Vector3(
        Math.cos(angle) * r + waveX, 
        y + waveY, 
        Math.sin(angle) * r + waveZ
      ));
    }
    const c = new THREE.CatmullRomCurve3(points);
    
    // Calculate star positions
    const sPos = [];
    const starCount = 40;
    for(let i=0; i<starCount; i++) {
      const t = Math.random();
      const pt = c.getPoint(t);
      pt.add(new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5));
      sPos.push({ pos: pt, phase: Math.random() * Math.PI * 2 });
    }

    return { curve: c, starPositions: sPos };
  }, []);

  useLayoutEffect(() => {
    if(!starsRef.current) return;
    const tempObj = new THREE.Object3D();
    starPositions.forEach((data, i) => {
      tempObj.position.copy(data.pos);
      tempObj.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const scale = 0.1 + Math.random() * 0.1;
      tempObj.scale.setScalar(scale);
      tempObj.updateMatrix();
      starsRef.current!.setMatrixAt(i, tempObj.matrix);
      starsRef.current!.setColorAt(i, new THREE.Color('#FFFFFF')); 
    });
    starsRef.current.instanceMatrix.needsUpdate = true;
  }, [starPositions]);

  useFrame((state) => {
    if (!groupRef.current || !starsRef.current) return;
    const t = state.clock.getElapsedTime();

    // Check camera distance for explosion effect
    const dist = state.camera.position.length();
    const explodeStart = 18;
    const explodeEnd = 4;
    const explodeFactor = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(dist, explodeStart, explodeEnd, 0, 1),
      0, 1
    );

    const targetScale = isVisible ? 1 : 0;
    const finalScale = targetScale * (1 - explodeFactor);

    groupRef.current.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.05);

    // Blink stars
    const tempObj = new THREE.Object3D();
    starPositions.forEach((data, i) => {
      starsRef.current!.getMatrixAt(i, tempObj.matrix);
      const blink = Math.sin(t * 4 + data.phase); 
      const pulseScale = 0.15 * (0.5 + 0.5 * (blink > 0 ? 1.5 : 0.5));
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      tempObj.matrix.decompose(p, q, s);
      tempObj.scale.setScalar(pulseScale);
      tempObj.updateMatrix();
      starsRef.current!.setMatrixAt(i, tempObj.matrix);
      
      if (blink > 0.8) {
         starsRef.current!.setColorAt(i, new THREE.Color('#FFFFFF'));
      } else {
         starsRef.current!.setColorAt(i, new THREE.Color('#AAAAAA'));
      }
    });
    
    starsRef.current.instanceMatrix.needsUpdate = true;
    if (starsRef.current.instanceColor) starsRef.current.instanceColor.needsUpdate = true;
    
    // Slow drift
    groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.2;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <tubeGeometry args={[curve, 200, 0.03, 5, false]} />
        <meshPhysicalMaterial 
          color="#E0E0E0" 
          emissive="#404040"
          roughness={0.2}
          metalness={0.6}
          transparent={true}
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <instancedMesh ref={starsRef} args={[undefined, undefined, starPositions.length]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

// --- Main Component ---

const MorphingTree: React.FC<MorphingTreeProps> = ({ treeState }) => {
  // 1. Shards (Tetrahedrons/Octahedrons) - The "Sequins"
  const shardMeshRef = useRef<THREE.InstancedMesh>(null);
  // 2. Dust (Tiny Spheres)
  const dustMeshRef = useRef<THREE.InstancedMesh>(null);
  // 3. Snowflakes (Glass Discs/Hexagons)
  const flakeMeshRef = useRef<THREE.InstancedMesh>(null);
  // 4. Blue Ornaments (Solid Diamonds)
  const blueFlakeMeshRef = useRef<THREE.InstancedMesh>(null);
  
  const TOTAL_PARTICLES = 3400;
  const TREE_HEIGHT = 12;
  const TREE_RADIUS = 5;
  
  const particles = useMemo(() => {
    const data: ParticleData[] = [];
    
    // Palette: White, Ice Blue, and faint Green hint
    const palette = [
      new THREE.Color('#FFFFFF'), // Pure White
      new THREE.Color('#F0FFFF'), // Azure (Ice)
      new THREE.Color('#E0FFFF'), // Light Cyan (Ice)
      new THREE.Color('#F5FFFA'), // Mint Cream (Subtle Green tint)
      new THREE.Color('#E0F2F1'), // Very light teal (Subtle Green tint)
    ];
    
    // Updated text content with heart symbol
    const textPositions = generateTextPositions(TOTAL_PARTICLES, "May we brave\nthe cold together,\ntill we see the\nwonders together. ♥");

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      // Tree formation
      const t = Math.pow(Math.random(), 0.85); // Concentrate slightly lower
      const y = t * TREE_HEIGHT - (TREE_HEIGHT / 2);
      const r = (1 - t) * TREE_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      
      const rOffset = r * (0.8 + Math.random() * 0.4); 
      const tx = rOffset * Math.cos(angle);
      const tz = rOffset * Math.sin(angle);
      const treePos = new THREE.Vector3(tx, y, tz);
      
      // Scatter formation - Slightly wider for better screen fill on zoom
      const scatterPos = randomInSphere(25); 
      const textPos = textPositions[i];
      const rotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const speedOffset = Math.random();
      
      // Determine Type
      // 0: Shards (Sequins) - 55%
      // 1: Dust (Tiny dots) - 35%
      // 2: Glass Snowflakes - 5%
      // 3: Blue Solid Snowflakes (Ornaments/Diamonds) - 5%
      const rand = Math.random();
      let typeId = 0;
      let scale = 0.1;
      let color = palette[Math.floor(Math.random() * palette.length)];

      if (rand < 0.55) {
        typeId = 0; // Shard
        scale = 0.08 + Math.random() * 0.12;
      } else if (rand < 0.90) {
        typeId = 1; // Dust
        scale = 0.03 + Math.random() * 0.05;
      } else if (rand < 0.95) {
        typeId = 2; // Glass Snowflake
        scale = 0.2 + Math.random() * 0.15;
        color = new THREE.Color('#FFFFFF');
      } else {
        typeId = 3; // Blue Solid Diamond
        // SMALLER SIZE
        scale = 0.08 + Math.random() * 0.06; 
        // LIGHTER BLUE
        color = new THREE.Color('#90CAF9'); 
      }

      data.push({ 
        scatterPosition: scatterPos, 
        treePosition: treePos, 
        textPosition: textPos,
        rotation, 
        scale, 
        color, 
        speedOffset,
        typeId
      });
    }
    return data;
  }, []);

  const { shardIndices, dustIndices, flakeIndices, blueIndices } = useMemo(() => {
    const s = [];
    const d = [];
    const f = [];
    const b = [];
    for(let i=0; i<particles.length; i++) {
      if(particles[i].typeId === 0) s.push(i);
      else if(particles[i].typeId === 1) d.push(i);
      else if(particles[i].typeId === 2) f.push(i);
      else b.push(i);
    }
    return { shardIndices: s, dustIndices: d, flakeIndices: f, blueIndices: b };
  }, [particles]);

  useLayoutEffect(() => {
    const initMesh = (mesh: THREE.InstancedMesh | null, indices: number[]) => {
      if (!mesh) return;
      const dummy = new THREE.Object3D();
      indices.forEach((pIndex, i) => {
        const p = particles[pIndex];
        dummy.position.copy(p.treePosition);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, p.color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    initMesh(shardMeshRef.current, shardIndices);
    initMesh(dustMeshRef.current, dustIndices);
    initMesh(flakeMeshRef.current, flakeIndices);
    initMesh(blueFlakeMeshRef.current, blueIndices);
  }, [particles, shardIndices, dustIndices, flakeIndices, blueIndices]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    const currentPos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    const currentScale = new THREE.Vector3();
    const currentQuat = new THREE.Quaternion();
    
    // Slow rotation
    const rotationY = time * 0.05;

    // Detect zoom level (distance from center)
    const cameraDist = state.camera.position.length();
    // Start exploding at distance 18, fully exploded at distance 4
    const explodeStart = 18; 
    const explodeEnd = 4;
    let explodeFactor = THREE.MathUtils.mapLinear(cameraDist, explodeStart, explodeEnd, 0, 1);
    explodeFactor = THREE.MathUtils.clamp(explodeFactor, 0, 1);

    const animateMesh = (mesh: THREE.InstancedMesh | null, indices: number[]) => {
      if (!mesh) return;

      for (let i = 0; i < indices.length; i++) {
        const pIndex = indices[i];
        const p = particles[pIndex];
        
        mesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(currentPos, currentQuat, currentScale);

        if (treeState === TreeState.TREE_SHAPE) {
          targetPos.copy(p.treePosition);
          const x = targetPos.x;
          const z = targetPos.z;
          targetPos.x = x * Math.cos(rotationY) - z * Math.sin(rotationY);
          targetPos.z = x * Math.sin(rotationY) + z * Math.cos(rotationY);
          
          // Gentle floating
          targetPos.y += Math.sin(time * 2 + p.treePosition.y) * 0.02;

        } else if (treeState === TreeState.TEXT_SHAPE) {
          targetPos.copy(p.textPosition);
          // Add gentle wave to text
          targetPos.y += Math.sin(time + p.textPosition.x) * 0.05;
        } else {
          targetPos.copy(p.scatterPosition);
        }

        // --- Explosion / Scatter Override ---
        // Blend current target towards scatter position based on zoom
        if (explodeFactor > 0.001) {
          // Add floating noise when exploded
          const noise = new THREE.Vector3(
             Math.sin(time * 0.5 + p.scatterPosition.y) * 1.5,
             Math.cos(time * 0.3 + p.scatterPosition.x) * 1.5,
             Math.sin(time * 0.4 + p.scatterPosition.z) * 1.5
          ).multiplyScalar(explodeFactor);
          
          // Lerp the base target to the scattered position
          targetPos.lerp(p.scatterPosition, explodeFactor);
          targetPos.add(noise);
        }

        const lerpSpeed = 0.04;
        currentPos.lerp(targetPos, lerpSpeed);
        
        dummy.rotation.set(
          p.rotation.x + time * 0.5,
          p.rotation.y + time * 0.5,
          p.rotation.z
        );

        // Twinkle/Shimmer logic
        const blinkSpeed = 2.0 + p.speedOffset * 3.0;
        let shimmer = 1.0;
        
        if (p.typeId === 0) { // Shards twinkle more
           shimmer = 0.8 + Math.sin(time * blinkSpeed) * 0.4;
        } else if (p.typeId === 1) { // Dust constant glow
           shimmer = 1.0 + Math.sin(time * 5 + p.speedOffset) * 0.2;
        } else if (p.typeId === 3) { // Blue Diamonds blinking
           shimmer = 0.5 + Math.abs(Math.sin(time * 3.0 + p.speedOffset * 10.0)) * 1.5;
        }
        
        // Scale management
        let scaleMultiplier = 1.0;
        
        if (treeState === TreeState.TEXT_SHAPE) {
          if (p.typeId === 2 || p.typeId === 3) {
             shimmer = 0; 
          } else {
             // If exploded, return to full size (1.0), otherwise keep thin (0.5)
             scaleMultiplier = THREE.MathUtils.lerp(0.5, 1.0, explodeFactor);
          }
        }

        dummy.scale.setScalar(p.scale * shimmer * scaleMultiplier);
        dummy.position.copy(currentPos);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    animateMesh(shardMeshRef.current, shardIndices);
    animateMesh(dustMeshRef.current, dustIndices);
    animateMesh(flakeMeshRef.current, flakeIndices);
    animateMesh(blueFlakeMeshRef.current, blueIndices);
  });

  return (
    <group>
      {/* 1. Shards: Bright Emissive Sequins */}
      <instancedMesh 
        ref={shardMeshRef} 
        args={[undefined, undefined, shardIndices.length]} 
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#FFFFFF"
          emissive="#E0FFFF" // Light Ice Blue emission
          emissiveIntensity={1.5}
          roughness={0.1} 
          metalness={0.8}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 2. Dust: Subtle White Glow */}
      <instancedMesh 
        ref={dustMeshRef} 
        args={[undefined, undefined, dustIndices.length]} 
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial 
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={1.0}
          roughness={0.5} 
          toneMapped={false}
        />
      </instancedMesh>

      {/* 3. Glass Snowflakes: Transparent */}
      <instancedMesh
        ref={flakeMeshRef}
        args={[undefined, undefined, flakeIndices.length]}
      >
        <cylinderGeometry args={[1, 1, 0.1, 6]} /> {/* Hexagon discs */}
        <meshPhysicalMaterial
          color="#E0F7FA"
          roughness={0.1}
          metalness={0.1}
          transmission={0.9} // Glass
          thickness={0.5}
          transparent
          opacity={0.8}
        />
      </instancedMesh>

      {/* 4. Blue Ornaments: Solid Glacier Blue Diamonds */}
      <instancedMesh
        ref={blueFlakeMeshRef}
        args={[undefined, undefined, blueIndices.length]}
      >
        <octahedronGeometry args={[1, 0]} /> 
        <meshStandardMaterial
          color="#90CAF9" // LIGHTER BLUE
          emissive="#90CAF9" 
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.9}
        />
      </instancedMesh>
      
      <RibbonWithStars isVisible={treeState === TreeState.TREE_SHAPE} />
      <FivePointedStar isVisible={treeState === TreeState.TREE_SHAPE} />
    </group>
  );
};

export default MorphingTree;