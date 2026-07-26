import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// The moving wireframe wave/particles
function WaveParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 60; // reduced grid size for much faster execution
  const sep = 4.0; // increased separation to cover the same area

  // Generate positions for the grid
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * count * 3);
    const col = new Float32Array(count * count * 3);
    const color = new THREE.Color();
    
    let i = 0;
    for (let ix = 0; ix < count; ix++) {
      for (let iy = 0; iy < count; iy++) {
        // x, y, z
        pos[i] = ix * sep - ((count * sep) / 2);
        pos[i + 1] = 0; // z will be animated
        pos[i + 2] = iy * sep - ((count * sep) / 2);

        // Mix deep purple and neon cyan based on position
        const mixRatio = (ix / count) * 0.4 + (iy / count) * 0.6;
        color.lerpColors(new THREE.Color('#7C3AED'), new THREE.Color('#00F5FF'), mixRatio);
        col[i] = color.r;
        col[i + 1] = color.g;
        col[i + 2] = color.b;

        i += 3;
      }
    }
    return [pos, col];
  }, [count, sep]);

  // Animate the wave with a clear, smooth flow
  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime() * 0.4; // slower, calmer flow
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let i = 0;
    for (let ix = 0; ix < count; ix++) {
      for (let iy = 0; iy < count; iy++) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Smoother, less chaotic wave math
        positions[i + 1] = 
          (Math.sin((ix + time * 1.5) * 0.08) * 4) + 
          (Math.sin((iy + time * 1.0) * 0.1) * 2);

        i += 3;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.02; // very slow pan
  });

  return (
    <points ref={pointsRef} position={[0, -12, -45]} rotation={[0.25, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.18} // slightly larger particles so they are easily visible
        vertexColors={true}
        transparent={true}
        opacity={0.9} // increased opacity for brightness
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Animated3DBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 bg-[#0A0514]">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 4, 25], fov: 60 }}>
        <fog attach="fog" args={['#0A0514', 15, 70]} />
        <ambientLight intensity={0.5} />
        
        <WaveParticles />
        
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.1} mipmapBlur intensity={2.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
