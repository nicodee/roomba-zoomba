import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

export function RoombaModel({ isSliding = false, hasMagnet = false }) {
  const brushLeftRef = useRef();
  const brushRightRef = useRef();
  const magnetGlowRef = useRef();
  const spotLeftRef = useRef();
  const spotRightRef = useRef();
  const targetLeftRef = useRef();
  const targetRightRef = useRef();

  useEffect(() => {
    if (spotLeftRef.current && targetLeftRef.current) {
      spotLeftRef.current.target = targetLeftRef.current;
    }
    if (spotRightRef.current && targetRightRef.current) {
      spotRightRef.current.target = targetRightRef.current;
    }
  }, []);

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

      {/* Twin Forward Headlights: Left Beam */}
      <group position={[-0.26, 0.1, -0.43]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
          <meshStandardMaterial color="#fffbeb" emissive="#fffbeb" emissiveIntensity={3} />
        </mesh>
        <spotLight
          ref={spotLeftRef}
          color="#fffbeb"
          intensity={4.0}
          distance={18}
          angle={Math.PI / 6}
          penumbra={0.65}
        />
        <object3D ref={targetLeftRef} position={[0, -0.1, -12]} />
      </group>

      {/* Twin Forward Headlights: Right Beam */}
      <group position={[0.26, 0.1, -0.43]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
          <meshStandardMaterial color="#fffbeb" emissive="#fffbeb" emissiveIntensity={3} />
        </mesh>
        <spotLight
          ref={spotRightRef}
          color="#fffbeb"
          intensity={4.0}
          distance={18}
          angle={Math.PI / 6}
          penumbra={0.65}
        />
        <object3D ref={targetRightRef} position={[0, -0.1, -12]} />
      </group>

      {/* Ambient Chassis LED Underglow */}
      <pointLight position={[0, 0.03, 0]} color="#38bdf8" intensity={1.5} distance={1.8} />

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
