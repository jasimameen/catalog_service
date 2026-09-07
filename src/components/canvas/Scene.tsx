"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function useScrollProgress() {
  const progress = useRef(0);
  const maxScroll = useRef(0);

  useEffect(() => {
    const updateMax = () => {
      maxScroll.current =
        document.documentElement.scrollHeight - window.innerHeight;
    };
    updateMax();

    const onScroll = () => {
      progress.current =
        maxScroll.current > 0 ? window.scrollY / maxScroll.current : 0;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateMax);
    const resizeObserver = new ResizeObserver(updateMax);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateMax);
      resizeObserver.disconnect();
    };
  }, []);

  return progress;
}

function Blob() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useScrollProgress();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x = progress.current * Math.PI * 0.6;

      const targetX = 1.3 + state.pointer.x * 0.3;
      const targetY = state.pointer.y * 0.2;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        0.03
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        0.03
      );
    }

    if (meshRef.current) {
      const s = 1.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={[1.3, 0, 0]}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.3, 2]} />
        <MeshDistortMaterial
          color="#5a6b00"
          roughness={0.25}
          metalness={0.2}
          distort={0.35}
          speed={1.4}
          emissive="#3a4200"
          emissiveIntensity={0.15}
          wireframe
        />
      </mesh>
      <mesh scale={0.99}>
        <icosahedronGeometry args={[1.3, 2]} />
        <meshBasicMaterial color="#f4f2ea" transparent opacity={0.94} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 3, 4]} intensity={30} color="#8a9d00" />
      <pointLight position={[-4, -3, -2]} intensity={15} color="#5a6bff" />
      <Blob />
      <Sparkles
        count={120}
        scale={[9, 6, 4]}
        size={2}
        speed={0.25}
        color="#15140f"
        opacity={0.35}
      />
      <fog attach="fog" args={["#f4f2ea", 5, 11]} />
    </Canvas>
  );
}
