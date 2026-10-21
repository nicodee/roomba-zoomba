import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export function GroundCord({ position }) {
  return (
    <group position={position}>
      {/* Black Extension Cable */}
      <mesh castShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Bright Yellow Plug Accent */}
      <mesh position={[0.6, 0.12, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.3]} />
        <meshStandardMaterial color="#eab308" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function CoffeeTable({ position }) {
  return (
    <group position={position}>
      {/* Glass / Wooden Tabletop elevated high enough to duck under */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[1.9, 0.1, 1.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} roughness={0.1} />
      </mesh>
      {/* Left Legs */}
      <mesh castShadow position={[-0.85, 0.42, -0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.85, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh castShadow position={[-0.85, 0.42, 0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.85, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Right Legs */}
      <mesh castShadow position={[0.85, 0.42, -0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.85, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh castShadow position={[0.85, 0.42, 0.6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.85, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

export function CardboardBoxes({ position }) {
  return (
    <group position={position}>
      {/* Stacked shipping boxes */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[1.6, 0.9, 1.2]} />
        <meshStandardMaterial color="#b45309" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.1, 1.15, -0.05]}>
        <boxGeometry args={[1.2, 0.6, 1.0]} />
        <meshStandardMaterial color="#d97706" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function DustBunny({ position }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 3;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4 + position[0]) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.22, 1]} />
      <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.8} roughness={0.3} />
    </mesh>
  );
}

export function VacuumMagnetPickup({ position }) {
  const meshRef = useRef();

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 4;
      meshRef.current.rotation.z += delta * 2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.5} />
    </mesh>
  );
}
