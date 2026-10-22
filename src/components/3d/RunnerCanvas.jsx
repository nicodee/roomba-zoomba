import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  playDustChime,
  playImpactThud,
  playDockChime,
  playRoomClearFanfare,
  playThresholdThud,
} from "../../utils/audioSynth";
import { BlueprintMiniMap, HOUSE_ZONES, getCurrentZone } from "./BlueprintMiniMap";
import { RoomVictoryModal } from "./RoomVictoryModal";

const LANE_WIDTH = 2.2;
const CHUNK_LENGTH = 40;
const INITIAL_SPEED = 14;

// Room Volumetric Profiles for dynamic camera breathing and scale
export const ROOM_PROFILES = {
  hallway: {
    id: "hallway",
    name: "Entry Hallway",
    camFov: 55,
    camHeight: 3.0,
    camDist: 4.8,
    wallWidth: 7.2,
    floorColor: "#d97706",
    floorRoughness: 0.55,
    floorMetalness: 0.08,
  },
  living_room: {
    id: "living_room",
    name: "Grand Living Room",
    camFov: 68,
    camHeight: 3.8,
    camDist: 5.8,
    wallWidth: 15.0,
    floorColor: "#881337", // Crimson Persian Area Rug
    floorRoughness: 0.85,
    floorMetalness: 0.02,
  },
  kitchen: {
    id: "kitchen",
    name: "Chef's Kitchen",
    camFov: 60,
    camHeight: 3.2,
    camDist: 5.2,
    wallWidth: 11.0,
    floorColor: "#f8fafc", // Glossy Ceramic White Tile
    floorRoughness: 0.15,
    floorMetalness: 0.40,
  },
};

export function RunnerCanvas({ onDistanceChange, onDustCollect, onGameOver }) {
  const mountRef = useRef(null);
  const restartRef = useRef(null);
  const proceedNextRoomRef = useRef(null);

  const stateRef = useRef({
    lane: 0,
    targetX: 0,
    playerX: 0,
    playerY: 0.1,
    velocityY: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    speed: INITIAL_SPEED,
    distance: 0,
    dustCount: 0,
    magnetTime: 0,
    isDead: false,
    trauma: 0,
    invincibleTimer: 2.0,
    activeZoneIndex: 0,
    dustInActiveRoom: 0,
    isDoorUnlocked: false,
    roomStartTime: performance.now(),
    battery: 100,
    // Volumetric transition & 90-degree corner drift state
    cornerTurnProgress: 0,
    targetCamFov: 55,
    currentCamFov: 55,
    targetCamHeight: 3.0,
    currentCamHeight: 3.0,
    lastThresholdCrossed: -1,
  });

  const [hudStats, setHudStats] = useState({
    distance: 0,
    dust: 0,
    magnetTime: 0,
    isDead: false,
    lane: 0,
    activeZoneIndex: 0,
    dustInActiveRoom: 0,
    roomCleanliness: 0,
    isDoorUnlocked: false,
    battery: 100,
  });

  const [victoryState, setVictoryState] = useState(null);

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (!s.isJumping && !s.isSliding && !s.isDead && !victoryState) {
      s.isJumping = true;
      s.velocityY = 7.8;
    }
  }, [victoryState]);

  const triggerSlide = useCallback(() => {
    const s = stateRef.current;
    if (s.isDead || victoryState) return;
    if (s.isJumping) {
      s.velocityY = -18;
    } else if (!s.isSliding) {
      s.isSliding = true;
      s.slideTimer = 0.65;
    }
  }, [victoryState]);

  const switchLane = useCallback((dir) => {
    const s = stateRef.current;
    if (s.isDead || victoryState) return;
    const nextLane = Math.max(-1, Math.min(1, s.lane + dir));
    s.lane = nextLane;
    s.targetX = nextLane * LANE_WIDTH;
    setHudStats((prev) => ({ ...prev, lane: nextLane }));
  }, [victoryState]);

  const handleRestart = useCallback(() => {
    if (restartRef.current) {
      restartRef.current();
    }
  }, []);

  const handleProceedNextRoom = useCallback(() => {
    if (proceedNextRoomRef.current) {
      proceedNextRoomRef.current();
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn("WebGL not available in current environment", e);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#fef3c7");
    scene.fog = new THREE.Fog("#fef3c7", 18, 85);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 120);
    camera.position.set(0, 3.0, 4.8);

    const ambientLight = new THREE.AmbientLight("#ffffff", 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#fffbeb", 1.25);
    sunLight.position.set(8, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // ==========================================
    // HERO ROOMBA MODEL ASSEMBLY
    // ==========================================
    const roombaGroup = new THREE.Group();
    scene.add(roombaGroup);

    const chassisGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 36);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: "#1e293b",
      roughness: 0.55,
      metalness: 0.15,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = true;
    chassisMesh.position.y = 0.09;
    roombaGroup.add(chassisMesh);

    const rimGeo = new THREE.TorusGeometry(0.65, 0.025, 16, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.25, metalness: 0.6 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.18;
    roombaGroup.add(rimMesh);

    const seamGeo = new THREE.TorusGeometry(0.52, 0.012, 12, 48);
    seamGeo.rotateX(Math.PI / 2);
    const seamMesh = new THREE.Mesh(seamGeo, new THREE.MeshBasicMaterial({ color: "#090d16" }));
    seamMesh.position.y = 0.182;
    roombaGroup.add(seamMesh);

    const faceplateGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.02, 36);
    const faceplateMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.35, metalness: 0.75 });
    const faceplateMesh = new THREE.Mesh(faceplateGeo, faceplateMat);
    faceplateMesh.position.y = 0.185;
    roombaGroup.add(faceplateMesh);

    const bumperGeo = new THREE.BoxGeometry(0.92, 0.15, 0.28);
    const bumperMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.85, metalness: 0.05 });
    const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat);
    bumperMesh.position.set(0, 0.09, -0.45);
    roombaGroup.add(bumperMesh);

    const haloGeo = new THREE.TorusGeometry(0.12, 0.018, 16, 32);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshStandardMaterial({
      color: "#06b6d4",
      emissive: "#06b6d4",
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 0.196, 0.08);
    roombaGroup.add(haloMesh);

    const buttonGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.015, 24);
    const buttonMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4 });
    const buttonMesh = new THREE.Mesh(buttonGeo, buttonMat);
    buttonMesh.position.set(0, 0.195, 0.08);
    roombaGroup.add(buttonMesh);

    const turretGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 28);
    const turretMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.12, metalness: 0.40 });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.set(0, 0.22, -0.06);
    roombaGroup.add(turretMesh);

    const opticGeo = new THREE.BoxGeometry(0.12, 0.03, 0.08);
    const opticMesh = new THREE.Mesh(opticGeo, new THREE.MeshBasicMaterial({ color: "#090d16" }));
    opticMesh.position.set(0, 0.23, -0.15);
    roombaGroup.add(opticMesh);

    const diodeGeo = new THREE.SphereGeometry(0.018, 12, 12);
    const diodeMesh = new THREE.Mesh(diodeGeo, new THREE.MeshBasicMaterial({ color: "#ef4444" }));
    diodeMesh.position.set(0, 0.23, -0.17);
    roombaGroup.add(diodeMesh);

    function createBrushRotor() {
      const rotor = new THREE.Group();
      const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 6);
      const boltMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.8, roughness: 0.2 });
      rotor.add(new THREE.Mesh(boltGeo, boltMat));

      for (let a = 0; a < 3; a++) {
        const armGeo = new THREE.BoxGeometry(0.03, 0.015, 0.15);
        armGeo.translate(0, 0, 0.075);
        const armMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.3 });
        const armMesh = new THREE.Mesh(armGeo, armMat);
        armMesh.rotation.y = (Math.PI * 2 * a) / 3;
        rotor.add(armMesh);
      }
      return rotor;
    }

    const brushLeft = createBrushRotor();
    brushLeft.position.set(-0.46, 0.025, -0.42);
    roombaGroup.add(brushLeft);

    const brushRight = createBrushRotor();
    brushRight.position.set(0.46, 0.025, -0.42);
    roombaGroup.add(brushRight);

    function createHeadlight(xPos) {
      const spot = new THREE.SpotLight("#fffbeb", 1.8, 14, Math.PI / 7, 0.45, 1.2);
      spot.position.set(xPos, 0.14, -0.48);
      const target = new THREE.Object3D();
      target.position.set(xPos, 0, -6);
      scene.add(target);
      spot.target = target;
      roombaGroup.add(spot);
      return spot;
    }

    createHeadlight(-0.28);
    createHeadlight(0.28);

    const underglowLight = new THREE.PointLight("#06b6d4", 1.8, 3.5, 2.0);
    underglowLight.position.set(0, 0.06, 0);
    roombaGroup.add(underglowLight);

    const shadowGeo = new THREE.CircleGeometry(0.78, 28);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.5 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // ==========================================
    // VOLUMETRIC ROOM CHUNKS & DOORWAY ARCHES
    // ==========================================
    const trackChunks = [];

    // Distinct floor materials for different rooms
    const floorMaterials = {
      hallway: new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.55, metalness: 0.08 }),
      living_room: new THREE.MeshStandardMaterial({ color: "#881337", roughness: 0.85, metalness: 0.02 }), // Persian Rug
      kitchen: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.15, metalness: 0.40 }),   // Glossy Tile
    };

    const dividerMat = new THREE.MeshBasicMaterial({ color: "#fef3c7", transparent: true, opacity: 0.65 });
    const archMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.7 });
    const doorBeamMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      emissive: "#f59e0b",
      emissiveIntensity: 1.5,
    });

    function createVolumetricChunk(zOffset, roomType = "hallway", isThreshold = false) {
      const chunkGroup = new THREE.Group();
      chunkGroup.position.z = zOffset;

      const profile = ROOM_PROFILES[roomType] || ROOM_PROFILES.hallway;
      const width = profile.wallWidth;

      // Floor plane sized to room width
      const floorGeo = new THREE.BoxGeometry(width, 0.1, CHUNK_LENGTH);
      const floor = new THREE.Mesh(floorGeo, floorMaterials[roomType] || floorMaterials.hallway);
      floor.receiveShadow = true;
      chunkGroup.add(floor);

      // Lane dividers
      const divGeo = new THREE.BoxGeometry(0.06, 0.01, CHUNK_LENGTH);
      const div1 = new THREE.Mesh(divGeo, dividerMat);
      div1.position.set(-1.1, 0.055, 0);
      chunkGroup.add(div1);

      const div2 = new THREE.Mesh(divGeo, dividerMat);
      div2.position.set(1.1, 0.055, 0);
      chunkGroup.add(div2);

      // Volumetric Walls / Skirting Boards adjusted to room width
      const halfW = width / 2;
      const baseboardGeo = new THREE.BoxGeometry(0.2, 0.8, CHUNK_LENGTH);
      const baseboardMat = new THREE.MeshStandardMaterial({ color: "#78350f" });

      const bLeft = new THREE.Mesh(baseboardGeo, baseboardMat);
      bLeft.position.set(-halfW, 0.4, 0);
      chunkGroup.add(bLeft);

      const bRight = new THREE.Mesh(baseboardGeo, baseboardMat);
      bRight.position.set(halfW, 0.4, 0);
      chunkGroup.add(bRight);

      // Crown Molding / Door Header on Threshold
      let doorIndicator = null;
      let tmolding = null;

      if (isThreshold) {
        // Door Jambs
        const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.4), archMat);
        archLeft.position.set(-halfW + 0.1, 1.9, 0);
        chunkGroup.add(archLeft);

        const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 0.4), archMat);
        archRight.position.set(halfW - 0.1, 1.9, 0);
        chunkGroup.add(archRight);

        // Header Lintel across width
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.4, 0.4), archMat);
        archTop.position.set(0, 3.8, 0);
        chunkGroup.add(archTop);

        // Status Beam
        doorIndicator = new THREE.Mesh(new THREE.BoxGeometry(width - 0.6, 0.16, 0.2), doorBeamMat);
        doorIndicator.position.set(0, 3.6, 0);
        chunkGroup.add(doorIndicator);

        // Raised Brass T-Molding Floor Threshold Strip
        const tmoldingGeo = new THREE.BoxGeometry(width, 0.04, 0.22);
        const tmoldingMat = new THREE.MeshStandardMaterial({ color: "#eab308", metalness: 0.9, roughness: 0.2 });
        tmolding = new THREE.Mesh(tmoldingGeo, tmoldingMat);
        tmolding.position.set(0, 0.07, 0);
        chunkGroup.add(tmolding);
      }

      scene.add(chunkGroup);
      return { group: chunkGroup, z: zOffset, isThreshold, doorIndicator, roomType };
    }

    for (let i = 0; i < 4; i++) {
      const roomKey = i < 2 ? "hallway" : i < 4 ? "living_room" : "kitchen";
      trackChunks.push(createVolumetricChunk(-i * CHUNK_LENGTH, roomKey, i === 1 || i === 3));
    }

    // ==========================================
    // PROCEDURAL ENTITIES & SPAWNING
    // ==========================================
    const activeObstacles = [];
    const activeDust = [];

    const cordGeo = new THREE.BoxGeometry(1.8, 0.22, 0.4);
    const cordMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.9 });

    const tableGeo = new THREE.BoxGeometry(1.9, 0.1, 1.4);
    const tableMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", transparent: true, opacity: 0.65 });

    const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.2);
    const boxMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.8 });

    const dustGeo = new THREE.IcosahedronGeometry(0.22, 0);
    const dustMat = new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#d97706", emissiveIntensity: 1.2 });

    function clearAllEntities() {
      activeObstacles.forEach((obs) => scene.remove(obs.mesh));
      activeObstacles.length = 0;

      activeDust.forEach((d) => scene.remove(d.mesh));
      activeDust.length = 0;
    }

    function spawnChunkContent(chunkZ) {
      if (chunkZ > -45) {
        for (let j = 0; j < 4; j++) {
          const dMesh = new THREE.Mesh(dustGeo, dustMat);
          dMesh.position.set(0, 0.3, chunkZ - 8 - j * 3.5);
          scene.add(dMesh);
          activeDust.push({ mesh: dMesh });
        }
        return;
      }

      const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
      const obsType = Math.random();
      const obsLane = lanes[0];
      let obsMesh;
      let typeStr;

      if (obsType < 0.35) {
        obsMesh = new THREE.Mesh(cordGeo, cordMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.11, chunkZ - 18);
        typeStr = "cord";
      } else if (obsType < 0.7) {
        obsMesh = new THREE.Group();
        const top = new THREE.Mesh(tableGeo, tableMat);
        top.position.y = 0.85;
        obsMesh.add(top);

        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85);
        const legMat = new THREE.MeshStandardMaterial({ color: "#1e293b" });
        [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.425, lz);
          obsMesh.add(leg);
        });
        obsMesh.position.set(obsLane * LANE_WIDTH, 0, chunkZ - 20);
        typeStr = "table";
      } else {
        obsMesh = new THREE.Mesh(boxGeo, boxMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.9, chunkZ - 22);
        typeStr = "box";
      }

      obsMesh.castShadow = true;
      scene.add(obsMesh);
      activeObstacles.push({ mesh: obsMesh, lane: obsLane, type: typeStr });

      const dustLane = lanes[1];
      for (let j = 0; j < 4; j++) {
        const dMesh = new THREE.Mesh(dustGeo, dustMat);
        dMesh.position.set(dustLane * LANE_WIDTH, 0.3, chunkZ - 8 - j * 3.5);
        scene.add(dMesh);
        activeDust.push({ mesh: dMesh });
      }
    }

    trackChunks.forEach((c) => {
      spawnChunkContent(c.z);
    });

    restartRef.current = () => {
      const s = stateRef.current;
      clearAllEntities();

      s.lane = 0;
      s.targetX = 0;
      s.playerX = 0;
      s.playerY = 0.1;
      s.velocityY = 0;
      s.isJumping = false;
      s.isSliding = false;
      s.speed = INITIAL_SPEED;
      s.distance = 0;
      s.dustCount = 0;
      s.magnetTime = 0;
      s.isDead = false;
      s.trauma = 0;
      s.invincibleTimer = 2.0;
      s.activeZoneIndex = 0;
      s.dustInActiveRoom = 0;
      s.isDoorUnlocked = false;
      s.roomStartTime = performance.now();
      s.battery = 100;
      s.cornerTurnProgress = 0;
      s.targetCamFov = 55;
      s.currentCamFov = 55;
      s.targetCamHeight = 3.0;
      s.currentCamHeight = 3.0;

      trackChunks.forEach((c, idx) => {
        c.group.position.z = -idx * CHUNK_LENGTH;
        spawnChunkContent(c.group.position.z);
      });

      setVictoryState(null);
      setHudStats({
        distance: 0,
        dust: 0,
        magnetTime: 0,
        isDead: false,
        lane: 0,
        activeZoneIndex: 0,
        dustInActiveRoom: 0,
        roomCleanliness: 0,
        isDoorUnlocked: false,
        battery: 100,
      });
      playDockChime();
    };

    proceedNextRoomRef.current = () => {
      const s = stateRef.current;
      const nextIndex = Math.min(HOUSE_ZONES.length - 1, s.activeZoneIndex + 1);
      s.activeZoneIndex = nextIndex;
      s.dustInActiveRoom = 0;
      s.isDoorUnlocked = false;
      s.roomStartTime = performance.now();
      s.invincibleTimer = 2.0;

      // Trigger 90-degree corner sweep arc
      s.cornerTurnProgress = 1.0;

      // Update target camera profile for new room
      const newZone = HOUSE_ZONES[nextIndex];
      const newProfile = ROOM_PROFILES[newZone.id] || ROOM_PROFILES.hallway;
      s.targetCamFov = newProfile.camFov;
      s.targetCamHeight = newProfile.camHeight;

      doorBeamMat.color.set("#f59e0b");
      doorBeamMat.emissive.set("#f59e0b");

      setVictoryState(null);
      playThresholdThud();
    };

    const handleKey = (e) => {
      const k = e.key ? e.key.toLowerCase() : "";
      const s = stateRef.current;

      if (
        k === "arrowleft" ||
        k === "arrowright" ||
        k === "arrowup" ||
        k === "arrowdown" ||
        k === " "
      ) {
        e.preventDefault();
      }

      if (s.isDead) {
        if (k === " " || k === "enter") {
          restartRef.current?.();
        }
        return;
      }

      if (k === "arrowleft" || k === "a") {
        switchLane(-1);
      } else if (k === "arrowright" || k === "d") {
        switchLane(1);
      } else if (k === "arrowup" || k === "w" || k === " ") {
        triggerJump();
      } else if (k === "arrowdown" || k === "s") {
        triggerSlide();
      }
    };
    window.addEventListener("keydown", handleKey);

    let lastTime = performance.now();
    let animId;
    let lastHudSyncTime = 0;

    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      const currentTime = now || performance.now();
      const rawDt = (currentTime - lastTime) / 1000;
      const dt = rawDt > 0 && rawDt < 0.1 ? rawDt : 0.016;
      lastTime = currentTime;

      const s = stateRef.current;

      if (victoryState) {
        renderer.render(scene, camera);
        return;
      }

      if (!s.isDead) {
        s.distance += Math.round(s.speed * dt);
        s.speed = Math.min(26, s.speed + 0.12 * dt);
        s.battery = Math.max(10, 100 - Math.round(s.distance * 0.15));

        if (s.invincibleTimer > 0) {
          s.invincibleTimer -= dt;
        }

        const activeZone = HOUSE_ZONES[s.activeZoneIndex] || HOUSE_ZONES[0];
        const roomCleanliness = Math.min(100, (s.dustInActiveRoom / activeZone.dustQuota) * 100);

        if (roomCleanliness >= 100 && !s.isDoorUnlocked) {
          s.isDoorUnlocked = true;
          doorBeamMat.color.set("#10b981");
          doorBeamMat.emissive.set("#10b981");
          doorBeamMat.emissiveIntensity = 3.0;
          playDockChime();
        }

        // T-Molding Threshold Detection & Tactile Hop
        const distToDoor = activeZone.doorwayAt - s.distance;
        if (distToDoor <= 1.5 && distToDoor >= -1.5 && s.lastThresholdCrossed !== activeZone.doorwayAt) {
          s.lastThresholdCrossed = activeZone.doorwayAt;
          // Tactile bump impulse
          s.playerY += 0.04;
          s.velocityY = 1.2;
          playThresholdThud();
        }

        // Check Door Threshold Crossing
        if (s.isDoorUnlocked && s.distance >= activeZone.doorwayAt && !victoryState) {
          playRoomClearFanfare();
          const elapsedSec = Math.round(((currentTime - s.roomStartTime) / 1000) * 10) / 10;
          const coins = Math.round(s.dustInActiveRoom * 1.5);

          setVictoryState({
            roomName: activeZone.name,
            nextRoomName: activeZone.nextRoom,
            cleanTimeSeconds: elapsedSec,
            dustCollected: s.dustInActiveRoom,
            quota: activeZone.dustQuota,
            batteryRemaining: s.battery,
            coinsEarned: coins,
          });
        }

        // Horizontal lane lerping
        const targetX = isNaN(s.targetX) ? 0 : s.targetX;
        let currentX = isNaN(s.playerX) ? 0 : s.playerX;
        const dx = targetX - currentX;
        currentX += dx * 16 * dt;
        s.playerX = currentX;

        // Vertical physics
        if (s.isJumping) {
          s.velocityY -= 26 * dt;
          s.playerY += s.velocityY * dt;
          if (s.playerY <= 0.1) {
            s.playerY = 0.1;
            s.velocityY = 0;
            s.isJumping = false;
          }
        }

        if (s.isSliding) {
          s.slideTimer -= dt;
          if (s.slideTimer <= 0) {
            s.isSliding = false;
          }
        }

        if (s.magnetTime > 0) {
          s.magnetTime = Math.max(0, s.magnetTime - dt);
        }

        roombaGroup.position.set(currentX, s.playerY, 0);

        // 90-Degree Corner Drift Turn Sweep Arc Decay
        let cornerRoll = 0;
        if (s.cornerTurnProgress > 0) {
          s.cornerTurnProgress = Math.max(0, s.cornerTurnProgress - 1.2 * dt);
          // Inward 8-degree camera & chassis sweep arc (0.14 rad)
          cornerRoll = Math.sin(s.cornerTurnProgress * Math.PI) * 0.14;
        }

        const rollAngle = -dx * 0.08 + cornerRoll;
        roombaGroup.rotation.z = isNaN(rollAngle) ? 0 : rollAngle;

        const scaleY = s.isSliding ? 0.45 : s.isJumping ? 1.2 : 1.0;
        roombaGroup.scale.set(1.0, scaleY, 1.0);

        const brushSpeed = s.speed * 1.5;
        brushLeft.rotation.y += dt * brushSpeed;
        brushRight.rotation.y -= dt * brushSpeed;

        const haloIntensity = 2.4 + Math.sin(currentTime * 0.005) * 0.8;
        haloMat.emissiveIntensity = haloIntensity;

        shadowMesh.position.x = currentX;
        const shadowScale = Math.max(0.3, 1.0 - (s.playerY - 0.1) * 0.6);
        shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
        shadowMat.opacity = Math.max(0.1, 0.5 - (s.playerY - 0.1) * 0.25);

        trackChunks.forEach((c) => {
          c.group.position.z += s.speed * dt;
          if (c.group.position.z > CHUNK_LENGTH) {
            let minZ = 0;
            trackChunks.forEach((tc) => {
              if (tc.group.position.z < minZ) minZ = tc.group.position.z;
            });
            c.group.position.z = minZ - CHUNK_LENGTH;
            spawnChunkContent(c.group.position.z);
          }
        });

        // Obstacles collision
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
          const obs = activeObstacles[i];
          obs.mesh.position.z += s.speed * dt;

          const dz = Math.abs(obs.mesh.position.z - 0);
          const dxObs = Math.abs(obs.mesh.position.x - currentX);

          if (s.invincibleTimer <= 0 && dz < 0.85 && dxObs < 0.8) {
            let cleared = false;
            if (obs.type === "cord" && s.playerY > 0.4) {
              cleared = true;
            } else if (obs.type === "table" && s.isSliding && s.playerY <= 0.25) {
              cleared = true;
            }

            if (!cleared) {
              s.isDead = true;
              s.trauma = 1.0;
              playImpactThud();
              setHudStats((prev) => ({ ...prev, isDead: true }));
              onGameOver?.(s.distance, s.dustCount);
              break;
            }
          }

          if (obs.mesh.position.z > 8) {
            scene.remove(obs.mesh);
            activeObstacles.splice(i, 1);
          }
        }

        // Dust collection
        for (let j = activeDust.length - 1; j >= 0; j--) {
          const d = activeDust[j];
          d.mesh.position.z += s.speed * dt;
          d.mesh.rotation.y += dt * 3;

          const distZ = Math.abs(d.mesh.position.z - 0);
          const distX = Math.abs(d.mesh.position.x - currentX);

          if (s.magnetTime > 0 && d.mesh.position.z > -10 && d.mesh.position.z < 4) {
            d.mesh.position.x += (currentX - d.mesh.position.x) * 12 * dt;
          }

          if (distZ < 0.75 && distX < 0.8) {
            s.dustCount += 1;
            s.dustInActiveRoom += 1;
            playDustChime(Math.min(12, s.dustInActiveRoom));
            scene.remove(d.mesh);
            activeDust.splice(j, 1);
            onDustCollect?.(s.dustCount);
            continue;
          }

          if (d.mesh.position.z > 8) {
            scene.remove(d.mesh);
            activeDust.splice(j, 1);
          }
        }

        if (currentTime - lastHudSyncTime > 200) {
          lastHudSyncTime = currentTime;
          const cleanPct = Math.min(100, Math.round((s.dustInActiveRoom / activeZone.dustQuota) * 100));
          setHudStats((prev) => ({
            ...prev,
            distance: s.distance,
            dust: s.dustCount,
            magnetTime: Math.round(s.magnetTime * 10) / 10,
            lane: s.lane,
            activeZoneIndex: s.activeZoneIndex,
            dustInActiveRoom: s.dustInActiveRoom,
            roomCleanliness: cleanPct,
            isDoorUnlocked: s.isDoorUnlocked,
            battery: s.battery,
          }));
          onDistanceChange?.(s.distance);
        }
      }

      // Volumetric Camera Breathing Interpolation (FOV 55° -> 68°)
      s.currentCamFov += (s.targetCamFov - s.currentCamFov) * 4 * dt;
      camera.fov = s.currentCamFov;
      camera.updateProjectionMatrix();

      // Camera Height Spring (Y 3.0m -> 3.8m)
      s.currentCamHeight += (s.targetCamHeight - s.currentCamHeight) * 4 * dt;

      // Camera Follow Rig & Centrifugal Banking with Inward Corner Roll
      const targetCamX = (isNaN(s.playerX) ? 0 : s.playerX) * 0.4;
      camera.position.x += (targetCamX - camera.position.x) * 8 * dt;

      if (s.trauma > 0) {
        s.trauma = Math.max(0, s.trauma - 2.0 * dt);
        const shakeMag = s.trauma * s.trauma * 0.35;
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y = s.currentCamHeight + (Math.random() - 0.5) * shakeMag;
      } else {
        camera.position.y = s.currentCamHeight;
      }

      // Camera Roll into 90-degree Corner Sweep
      if (s.cornerTurnProgress > 0) {
        camera.rotation.z = Math.sin(s.cornerTurnProgress * Math.PI) * -0.14; // -8 degrees
      } else {
        camera.rotation.z = 0;
      }

      const lookTargetX = (isNaN(s.playerX) ? 0 : s.playerX) * 0.15;
      camera.lookAt(lookTargetX, 0.7, -14);
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      clearAllEntities();
      if (container && renderer && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
  }, [onDistanceChange, onDustCollect, onGameOver, triggerJump, triggerSlide, switchLane, victoryState]);

  return (
    <div className="runner-3d-layout">
      {/* Primary 3D WebGL Runner Window */}
      <div className="runner-3d-wrapper">
        <div className="runner-viewport" ref={mountRef} />

        {/* Floating In-Game Room Objective & Stats HUD */}
        <div className="runner-hud-panel">
          <div className="runner-stat-badge">
            <span className="badge-label">
              LVL {hudStats.activeZoneIndex + 1}: {HOUSE_ZONES[hudStats.activeZoneIndex]?.name.toUpperCase()}
            </span>
            <span className="badge-val">
              {hudStats.roomCleanliness}% {hudStats.isDoorUnlocked ? "🟢 UNLOCKED" : "🧹 CLEANING"}
            </span>
          </div>
          <div className="runner-stat-badge">
            <span className="badge-label">ROOM DUST</span>
            <span className="badge-val">
              ⭐ {hudStats.dustInActiveRoom}/{HOUSE_ZONES[hudStats.activeZoneIndex]?.dustQuota}
            </span>
          </div>
          <div className="runner-stat-badge">
            <span className="badge-label">BATTERY</span>
            <span className="badge-val">{hudStats.battery}% ⚡</span>
          </div>
        </div>

        {/* Touch Controls */}
        <div className="runner-touch-controls">
          <button className="touch-btn" onClick={() => switchLane(-1)}>⬅️ Left (A)</button>
          <button className="touch-btn jump-btn" onClick={triggerJump}>⬆️ Jump (W)</button>
          <button className="touch-btn duck-btn" onClick={triggerSlide}>⬇️ Slide (S)</button>
          <button className="touch-btn" onClick={() => switchLane(1)}>➡️ Right (D)</button>
        </div>

        {/* Crash Modal */}
        {hudStats.isDead && (
          <div className="runner-game-over-overlay">
            <div className="game-over-dialog">
              <h2>💥 CRASH!</h2>
              <p>The Roomba hit a domestic hazard!</p>
              <div className="dialog-stats">
                <div>Distance: <strong>{hudStats.distance}m</strong></div>
                <div>Dust Bunnies: <strong>⭐ {hudStats.dust}</strong></div>
              </div>
              <button className="run-again-btn" onClick={handleRestart}>
                🧹 RUN AGAIN (Space)
              </button>
            </div>
          </div>
        )}

        {/* Room 100% Victory Modal */}
        {victoryState && (
          <RoomVictoryModal
            roomName={victoryState.roomName}
            nextRoomName={victoryState.nextRoomName}
            cleanTimeSeconds={victoryState.cleanTimeSeconds}
            dustCollected={victoryState.dustCollected}
            quota={victoryState.quota}
            batteryRemaining={victoryState.batteryRemaining}
            coinsEarned={victoryState.coinsEarned}
            onProceed={handleProceedNextRoom}
          />
        )}
      </div>

      {/* Real-Time Architectural Blueprint Mini-Map */}
      <BlueprintMiniMap
        distance={hudStats.distance}
        playerLane={hudStats.lane}
        dustCount={hudStats.dustInActiveRoom}
        roomCleanliness={hudStats.roomCleanliness}
        isDoorUnlocked={hudStats.isDoorUnlocked}
      />
    </div>
  );
}
