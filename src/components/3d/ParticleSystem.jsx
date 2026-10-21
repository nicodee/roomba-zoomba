import React, { useRef, useImperativeHandle, forwardRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// High performance particle pool
export const ParticleSystem = forwardRef((props, ref) => {
  const particlesRef = useRef([]); // { type, pos: [x,y,z], vel: [vx,vy,vz], color, size, life, maxLife }
  const dummy = useRef(new THREE.Object3D());
  const [, setTick] = useState(0);

  useImperativeHandle(ref, () => ({
    // 1. Dust Collection Sparkle Burst (12 golden particles)
    emitDustBurst(x, y, z) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.8 + Math.random() * 2.2;
        particlesRef.current.push({
          type: "sparkle",
          x,
          y: y + 0.1,
          z,
          vx: Math.cos(angle) * speed,
          vy: 2.0 + Math.random() * 2.5,
          vz: Math.sin(angle) * speed,
          color: i % 2 === 0 ? "#fbbf24" : "#f59e0b",
          size: 0.12,
          life: 0.35,
          maxLife: 0.35
        });
      }
    },

    // 2. Jump Launch Smoke Rings (2 expanding floor rings at wheels)
    emitJumpPuff(x, y, z) {
      [-0.38, 0.38].forEach((xOffset) => {
        particlesRef.current.push({
          type: "ring",
          x: x + xOffset,
          y: y + 0.02,
          z: z + 0.2,
          vx: 0,
          vy: 0.05,
          vz: 0,
          color: "#fef3c7",
          size: 0.18,
          targetSize: 0.75,
          life: 0.25,
          maxLife: 0.25
        });
      });
    },

    // 3. Suction Slide Floor Sparks (electric cyan sparks trailing behind bumper)
    emitSlideSparks(x, y, z) {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          type: "spark",
          x: x + (Math.random() - 0.5) * 0.6,
          y: y + 0.04,
          z: z + 0.35,
          vx: (Math.random() - 0.5) * 2.5,
          vy: 0.8 + Math.random() * 1.5,
          vz: 3.5 + Math.random() * 4.0, // Shoot backward relative to forward speed
          color: i % 2 === 0 ? "#38bdf8" : "#e0f2fe",
          size: 0.09,
          life: 0.18,
          maxLife: 0.18
        });
      }
    }
  }));

  useFrame((_, delta) => {
    if (particlesRef.current.length === 0) return;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= delta;

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      // Physics update
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      if (p.type === "sparkle") {
        p.vy -= 9.8 * delta; // Gravity on sparkles
      } else if (p.type === "spark") {
        p.vy -= 12.0 * delta;
      } else if (p.type === "ring") {
        // Expand ring size smoothly
        const progress = 1 - p.life / p.maxLife;
        p.size = 0.18 + (p.targetSize - 0.18) * progress;
      }
    }

    // Force re-render of active particles
    setTick((t) => (t + 1) % 1000);
  });

  return (
    <group>
      {particlesRef.current.map((p, idx) => {
        const opacity = Math.max(0, p.life / p.maxLife);

        if (p.type === "ring") {
          return (
            <mesh key={idx} position={[p.x, p.y, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[p.size * 0.7, p.size, 24]} />
              <meshBasicMaterial color={p.color} transparent opacity={opacity * 0.6} side={THREE.DoubleSide} />
            </mesh>
          );
        }

        return (
          <mesh key={idx} position={[p.x, p.y, p.z]}>
            <octahedronGeometry args={[p.size * opacity, 0]} />
            <meshBasicMaterial color={p.color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
});
