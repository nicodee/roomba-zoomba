import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export function RoombaModel({ isSliding = false, hasMagnet = false }) {
  const brushLeftRef = useRef();
  const brushRightRef = useRef();
  const magnetGlowRef = useRef();

  useFrame((_, delta) => {
    if (brushLeftRef.current) brushLeftRef.current.rotation.y += delta * 18;
    if (brushRightRef.current) brushRightRef.current.rotation.y -= delta * 18;
    if (magnetGlowRef.current) {
      magnetGlowRef.current.rotation.y += delta * 4;
      magnetGlowRef.current.rotation.z += delta * 3;
    }
  });

  return (
    <group>
      {/* Main Cylindrical Chassis */}
      <mesh castShadow receiveShadow position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.18, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Top Glossy Sensor Puck */}
      <mesh position={[0, 0.2, -0.05]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
        <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Power / Status LED Glow */}
      <mesh position={[0, 0.25, -0.05]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
      </mesh>

      {/* Front Curved Bumper Ring */}
      <mesh position={[0, 0.09, -0.42]}>
        <boxGeometry args={[0.85, 0.14, 0.22]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Whirling Left Side Brush */}
      <group ref={brushLeftRef} position={[-0.45, 0.02, -0.4]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 3]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Whirling Right Side Brush */}
      <group ref={brushRightRef} position={[0.45, 0.02, -0.4]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 3]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Magnet Shield Ring Aura */}
      {hasMagnet && (
        <mesh ref={magnetGlowRef} position={[0, 0.1, 0]}>
          <torusGeometry args={[0.85, 0.04, 16, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} wireframe />
        </mesh>
      )}
    </group>
  );
}
