import React from "react";

export const CHUNK_LENGTH = 40;
export const LANE_WIDTH = 2.2;

export function TrackSegment({ positionZ }) {
  return (
    <group position={[0, 0, positionZ]}>
      {/* Polished Hardwood Hallway Floor */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[7.2, 0.1, CHUNK_LENGTH]} />
        <meshStandardMaterial color="#d97706" roughness={0.6} />
      </mesh>

      {/* Dashed Lane Dividers */}
      <mesh position={[-1.1, 0.055, 0]}>
        <boxGeometry args={[0.06, 0.01, CHUNK_LENGTH]} />
        <meshBasicMaterial color="#fef3c7" opacity={0.6} transparent />
      </mesh>
      <mesh position={[1.1, 0.055, 0]}>
        <boxGeometry args={[0.06, 0.01, CHUNK_LENGTH]} />
        <meshBasicMaterial color="#fef3c7" opacity={0.6} transparent />
      </mesh>

      {/* Left Wall Skirting Baseboard */}
      <mesh position={[-3.6, 0.5, 0]}>
        <boxGeometry args={[0.2, 1.0, CHUNK_LENGTH]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>

      {/* Right Wall Skirting Baseboard */}
      <mesh position={[3.6, 0.5, 0]}>
        <boxGeometry args={[0.2, 1.0, CHUNK_LENGTH]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
    </group>
  );
}
