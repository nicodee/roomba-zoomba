import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoombaModel } from "./RoombaModel";
import { TrackSegment, CHUNK_LENGTH, LANE_WIDTH } from "./TrackSegment";
import { GroundCord, CoffeeTable, CardboardBoxes, DustBunny, VacuumMagnetPickup } from "./Obstacles";
import { useRunnerControls } from "../../hooks/useRunnerControls";
import { audioEngine } from "../../utils/audioEngine";

const GRAVITY = -26;
const JUMP_FORCE = 7.8;
const SLIDE_DURATION = 0.65;

// Procedural chunk generator: guarantees at least 1 safe path
function generateChunkContent(chunkZ, chunkIndex) {
  if (chunkIndex === 0) return { obstacles: [], collectibles: [] }; // First chunk is clear

  const obstacles = [];
  const collectibles = [];
  const lanes = [-1, 0, 1];

  // Spawn 2 obstacle clusters per 40m chunk
  const zOffsets = [-12, -28];
  zOffsets.forEach((zOff) => {
    const obsZ = chunkZ + zOff;
    const types = ["cord", "table", "boxes"];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

    obstacles.push({
      id: `obs-${chunkIndex}-${zOff}`,
      type: chosenType,
      lane: chosenLane,
      x: chosenLane * LANE_WIDTH,
      z: obsZ
    });

    // Spawn dust trail in other lanes
    const freeLanes = lanes.filter((l) => l !== chosenLane);
    const dustLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    for (let i = 0; i < 4; i++) {
      collectibles.push({
        id: `dust-${chunkIndex}-${zOff}-${i}`,
        type: "dust",
        lane: dustLane,
        x: dustLane * LANE_WIDTH,
        y: 0.35,
        z: obsZ + (i - 1.5) * 2.2,
        collected: false
      });
    }

    // Occasional magnet pickup (15% chance)
    if (Math.random() < 0.15) {
      const magnetLane = freeLanes[0];
      collectibles.push({
        id: `magnet-${chunkIndex}-${zOff}`,
        type: "magnet",
        lane: magnetLane,
        x: magnetLane * LANE_WIDTH,
        y: 0.5,
        z: obsZ + 5,
        collected: false
      });
    }
  });

  return { obstacles, collectibles };
}

function GameWorld({
  isGameOver,
  onGameOver,
  onUpdateStats,
  activeMagnet,
  onActivateMagnet
}) {
  const [lane, setLane] = useState(0); // -1, 0, 1
  const playerZRef = useRef(0);
  const playerXRef = useRef(0);
  const playerYRef = useRef(0.05);
  const vyRef = useRef(0);
  const isJumpingRef = useRef(false);
  const isSlidingRef = useRef(false);
  const slideTimerRef = useRef(0);
  const rollRef = useRef(0);
  const roombaGroupRef = useRef();

  const [chunks, setChunks] = useState(() => [
    { id: 0, z: 0, ...generateChunkContent(0, 0) },
    { id: 1, z: -CHUNK_LENGTH, ...generateChunkContent(-CHUNK_LENGTH, 1) },
    { id: 2, z: -CHUNK_LENGTH * 2, ...generateChunkContent(-CHUNK_LENGTH * 2, 2) }
  ]);

  const dustStreakRef = useRef(0);

  // Keyboard & Touch navigation controls
  useRunnerControls({
    onLeft: () => {
      if (!isGameOver) setLane((l) => Math.max(-1, l - 1));
    },
    onRight: () => {
      if (!isGameOver) setLane((l) => Math.min(1, l + 1));
    },
    onJump: () => {
      if (!isGameOver && !isJumpingRef.current && !isSlidingRef.current) {
        isJumpingRef.current = true;
        vyRef.current = JUMP_FORCE;
        audioEngine.playJumpBoing();
      }
    },
    onDuck: () => {
      if (isGameOver) return;
      if (isJumpingRef.current) {
        vyRef.current = -18; // Fast-fall cancel
        audioEngine.playSuctionSlide();
      } else if (!isSlidingRef.current) {
        isSlidingRef.current = true;
        slideTimerRef.current = SLIDE_DURATION;
        audioEngine.playSuctionSlide();
      }
    },
    isPaused: isGameOver
  });

  useFrame((state, delta) => {
    if (isGameOver) return;

    // 1. Forward progression (velocity accelerates gently over time)
    const baseSpeed = 16 + Math.min(12, Math.floor(-playerZRef.current / 80));
    playerZRef.current -= baseSpeed * delta;
    onUpdateStats?.({ distance: Math.floor(-playerZRef.current) });

    // 2. Smooth horizontal lane interpolation & banking
    const targetX = lane * LANE_WIDTH;
    const prevX = playerXRef.current;
    playerXRef.current = THREE.MathUtils.damp(playerXRef.current, targetX, 18, delta);
    const lateralVel = (playerXRef.current - prevX) / delta;
    const targetRoll = -lateralVel * 0.035;
    rollRef.current = THREE.MathUtils.damp(rollRef.current, targetRoll, 12, delta);

    // 3. Vertical jump physics
    if (isJumpingRef.current) {
      vyRef.current += GRAVITY * delta;
      playerYRef.current += vyRef.current * delta;

      if (playerYRef.current <= 0.05) {
        playerYRef.current = 0.05;
        vyRef.current = 0;
        isJumpingRef.current = false;
      }
    }

    // 4. Slide duration timer
    let scaleY = 1.0;
    if (isSlidingRef.current) {
      slideTimerRef.current -= delta;
      scaleY = 0.45;
      if (slideTimerRef.current <= 0) {
        isSlidingRef.current = false;
      }
    }

    // Apply transforms to Roomba group
    if (roombaGroupRef.current) {
      roombaGroupRef.current.position.set(playerXRef.current, playerYRef.current, playerZRef.current);
      roombaGroupRef.current.rotation.z = rollRef.current;
      roombaGroupRef.current.scale.set(1.0, scaleY, 1.0);
    }

    // 5. Follow Camera
    state.camera.position.x = playerXRef.current * 0.35;
    state.camera.position.y = 3.2;
    state.camera.position.z = playerZRef.current + 4.8;
    state.camera.lookAt(playerXRef.current * 0.15, 0.7, playerZRef.current - 14);

    // 6. Collision & Collectibles Detection
    const pX = playerXRef.current;
    const pY = playerYRef.current;
    const pZ = playerZRef.current;

    chunks.forEach((chunk) => {
      // Check Obstacle Collisions
      chunk.obstacles.forEach((obs) => {
        const dz = Math.abs(obs.z - pZ);
        const dx = Math.abs(obs.x - pX);

        if (dz < 0.9 && dx < 0.95) {
          let hasCrashed = false;

          if (obs.type === "cord") {
            // Must jump over: if player not high enough, crash!
            if (pY < 0.4) hasCrashed = true;
          } else if (obs.type === "table") {
            // Must duck under: if not sliding or jumping, crash!
            if (!isSlidingRef.current || pY > 0.45) hasCrashed = true;
          } else if (obs.type === "boxes") {
            // Full blocker: unavoidable crash in lane
            hasCrashed = true;
          }

          if (hasCrashed) {
            audioEngine.playCrash();
            onGameOver();
          }
        }
      });

      // Check Collectibles
      chunk.collectibles.forEach((item) => {
        if (item.collected) return;

        const dz = Math.abs(item.z - pZ);
        const dx = Math.abs(item.x - pX);

        // Magnet suction logic: pull toward player
        if (activeMagnet && dz < 12) {
          item.x += (pX - item.x) * 14 * delta;
          item.z += (pZ - item.z) * 14 * delta;
        }

        if (dz < 1.1 && dx < 1.0) {
          item.collected = true;
          if (item.type === "dust") {
            dustStreakRef.current += 1;
            audioEngine.playDustChime(dustStreakRef.current);
            onUpdateStats?.({ addDust: 1 });
          } else if (item.type === "magnet") {
            audioEngine.playDustChime(4);
            onActivateMagnet();
          }
        }
      });
    });

    // 7. Infinite Chunk Streaming: Recycle chunks that have passed behind the camera
    setChunks((prev) => {
      const firstChunk = prev[0];
      if (firstChunk.z - playerZRef.current > CHUNK_LENGTH + 5) {
        const lastChunk = prev[prev.length - 1];
        const nextId = firstChunk.id + 3;
        const nextZ = lastChunk.z - CHUNK_LENGTH;
        const newChunk = {
          id: nextId,
          z: nextZ,
          ...generateChunkContent(nextZ, nextId)
        };
        return [...prev.slice(1), newChunk];
      }
      return prev;
    });
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[12, 24, 12]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
      />
      <fog attach="fog" args={["#fef3c7", 20, 75]} />

      {/* Render Infinite Floor Segments */}
      {chunks.map((chunk) => (
        <group key={chunk.id}>
          <TrackSegment positionZ={chunk.z} />

          {/* Obstacles in Chunk */}
          {chunk.obstacles.map((obs) => {
            if (obs.type === "cord") return <GroundCord key={obs.id} position={[obs.x, 0, obs.z]} />;
            if (obs.type === "table") return <CoffeeTable key={obs.id} position={[obs.x, 0, obs.z]} />;
            return <CardboardBoxes key={obs.id} position={[obs.x, 0, obs.z]} />;
          })}

          {/* Collectibles in Chunk */}
          {chunk.collectibles.map((item) => {
            if (item.collected) return null;
            if (item.type === "dust") return <DustBunny key={item.id} position={[item.x, item.y, item.z]} />;
            return <VacuumMagnetPickup key={item.id} position={[item.x, item.y, item.z]} />;
          })}
        </group>
      ))}

      {/* 3D Roomba Model Group */}
      <group ref={roombaGroupRef}>
        <RoombaModel isSliding={isSlidingRef.current} hasMagnet={activeMagnet} />
      </group>
    </>
  );
}

export function RunnerScene({
  isGameOver,
  onGameOver,
  onUpdateStats,
  activeMagnet,
  onActivateMagnet
}) {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 3.2, 5], fov: 60 }}
        shadows
        style={{ background: "#fef3c7" }}
      >
        <GameWorld
          isGameOver={isGameOver}
          onGameOver={onGameOver}
          onUpdateStats={onUpdateStats}
          activeMagnet={activeMagnet}
          onActivateMagnet={onActivateMagnet}
        />
      </Canvas>
    </div>
  );
}
