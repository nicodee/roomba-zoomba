import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { playDustChime, playImpactThud, playDockChime } from "../../utils/audioSynth";

const LANE_WIDTH = 2.2;
const CHUNK_LENGTH = 40;
const INITIAL_SPEED = 14;

export function RunnerCanvas({ onDistanceChange, onDustCollect, onGameOver }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    lane: 0, // -1: Left, 0: Center, 1: Right
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
  });

  const [hudStats, setHudStats] = useState({
    distance: 0,
    dust: 0,
    magnetTime: 0,
    isDead: false,
  });

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (!s.isJumping && !s.isSliding && !s.isDead) {
      s.isJumping = true;
      s.velocityY = 7.5;
    }
  }, []);

  const triggerSlide = useCallback(() => {
    const s = stateRef.current;
    if (s.isDead) return;
    if (s.isJumping) {
      s.velocityY = -18; // Fast fall slam
    } else if (!s.isSliding) {
      s.isSliding = true;
      s.slideTimer = 0.65;
    }
  }, []);

  const switchLane = useCallback((dir) => {
    const s = stateRef.current;
    if (s.isDead) return;
    const nextLane = Math.max(-1, Math.min(1, s.lane + dir));
    s.lane = nextLane;
    s.targetX = nextLane * LANE_WIDTH;
  }, []);

  const restartRun = useCallback(() => {
    const s = stateRef.current;
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
    setHudStats({ distance: 0, dust: 0, magnetTime: 0, isDead: false });
    playDockChime();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
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
      // In non-WebGL environments (like jsdom tests)
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#fef3c7");
    scene.fog = new THREE.Fog("#fef3c7", 15, 75);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.2);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight("#ffffff", 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#fffbeb", 1.2);
    sunLight.position.set(8, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // 3. Roomba Player Model
    const roombaGroup = new THREE.Group();
    scene.add(roombaGroup);

    // Chassis
    const chassisGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 32);
    const chassisMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.4, metalness: 0.2 });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = true;
    chassisMesh.position.y = 0.09;
    roombaGroup.add(chassisMesh);

    // Rubber Front Bumper
    const bumperGeo = new THREE.BoxGeometry(0.9, 0.14, 0.25);
    const bumperMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.8 });
    const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat);
    bumperMesh.position.set(0, 0.09, -0.45);
    roombaGroup.add(bumperMesh);

    // Glossy Cyan Sensor Turret
    const turretGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24);
    const turretMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.2, metalness: 0.6 });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.set(0, 0.22, -0.05);
    roombaGroup.add(turretMesh);

    // Emerald Status LED
    const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 2.5 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.27, -0.05);
    roombaGroup.add(ledMesh);

    // Dual Whirling Bristle Brushes
    const brushGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 3);
    const brushMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
    const brushLeft = new THREE.Mesh(brushGeo, brushMat);
    brushLeft.position.set(-0.45, 0.02, -0.4);
    roombaGroup.add(brushLeft);

    const brushRight = new THREE.Mesh(brushGeo, brushMat);
    brushRight.position.set(0.45, 0.02, -0.4);
    roombaGroup.add(brushRight);

    // Contact Ground Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(0.75, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.45,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // 4. Procedural Track Chunks
    const trackChunks = [];
    const chunkFloorGeo = new THREE.BoxGeometry(7.2, 0.1, CHUNK_LENGTH);
    const chunkFloorMat = new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.6 });

    const dividerGeo = new THREE.BoxGeometry(0.06, 0.01, CHUNK_LENGTH);
    const dividerMat = new THREE.MeshBasicMaterial({ color: "#fef3c7", transparent: true, opacity: 0.65 });

    function createChunk(zOffset) {
      const chunkGroup = new THREE.Group();
      chunkGroup.position.z = zOffset;

      const floor = new THREE.Mesh(chunkFloorGeo, chunkFloorMat);
      floor.receiveShadow = true;
      chunkGroup.add(floor);

      const div1 = new THREE.Mesh(dividerGeo, dividerMat);
      div1.position.set(-1.1, 0.055, 0);
      chunkGroup.add(div1);

      const div2 = new THREE.Mesh(dividerGeo, dividerMat);
      div2.position.set(1.1, 0.055, 0);
      chunkGroup.add(div2);

      // Skirting Baseboards
      const baseboardGeo = new THREE.BoxGeometry(0.2, 0.8, CHUNK_LENGTH);
      const baseboardMat = new THREE.MeshStandardMaterial({ color: "#78350f" });
      const bLeft = new THREE.Mesh(baseboardGeo, baseboardMat);
      bLeft.position.set(-3.6, 0.4, 0);
      chunkGroup.add(bLeft);

      const bRight = new THREE.Mesh(baseboardGeo, baseboardMat);
      bRight.position.set(3.6, 0.4, 0);
      chunkGroup.add(bRight);

      scene.add(chunkGroup);
      return { group: chunkGroup, z: zOffset };
    }

    for (let i = 0; i < 4; i++) {
      trackChunks.push(createChunk(-i * CHUNK_LENGTH));
    }

    // 5. Obstacles & Collectibles Pool
    const activeObstacles = [];
    const activeDust = [];

    // Obstacle Geometries
    const cordGeo = new THREE.BoxGeometry(1.8, 0.22, 0.4);
    const cordMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.9 });

    const tableGeo = new THREE.BoxGeometry(1.9, 0.1, 1.4);
    const tableMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", transparent: true, opacity: 0.6 });

    const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.2);
    const boxMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.8 });

    // Dust Bunny Geometry
    const dustGeo = new THREE.IcosahedronGeometry(0.22, 0);
    const dustMat = new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#d97706", emissiveIntensity: 1.2 });

    function spawnChunkContent(chunkZ) {
      const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);

      const obsType = Math.random();
      const obsLane = lanes[0];
      let obsMesh;
      let typeStr;

      if (obsType < 0.35) {
        obsMesh = new THREE.Mesh(cordGeo, cordMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.11, chunkZ - 15);
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
        obsMesh.position.set(obsLane * LANE_WIDTH, 0, chunkZ - 18);
        typeStr = "table";
      } else {
        obsMesh = new THREE.Mesh(boxGeo, boxMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.9, chunkZ - 20);
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
      if (c.z < -10) spawnChunkContent(c.z);
    });

    const handleKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") switchLane(-1);
      else if (k === "arrowright" || k === "d") switchLane(1);
      else if (k === "arrowup" || k === "w" || k === " ") triggerJump();
      else if (k === "arrowdown" || k === "s") triggerSlide();
    };
    window.addEventListener("keydown", handleKey);

    let lastTime = performance.now();
    let animId;

    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const s = stateRef.current;

      if (!s.isDead) {
        s.distance += Math.round(s.speed * dt);
        s.speed = Math.min(26, s.speed + 0.15 * dt);

        const dx = s.targetX - s.playerX;
        s.playerX += dx * 16 * dt;

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

        roombaGroup.position.set(s.playerX, s.playerY, 0);

        const rollAngle = -dx * 0.08;
        roombaGroup.rotation.z = rollAngle;

        const scaleY = s.isSliding ? 0.45 : s.isJumping ? 1.2 : 1.0;
        roombaGroup.scale.set(1.0, scaleY, 1.0);

        brushLeft.rotation.y += dt * 18;
        brushRight.rotation.y -= dt * 18;

        shadowMesh.position.x = s.playerX;
        const shadowScale = Math.max(0.3, 1.0 - (s.playerY - 0.1) * 0.6);
        shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
        shadowMat.opacity = Math.max(0.1, 0.45 - (s.playerY - 0.1) * 0.25);

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

        for (let i = activeObstacles.length - 1; i >= 0; i--) {
          const obs = activeObstacles[i];
          obs.mesh.position.z += s.speed * dt;

          const dz = Math.abs(obs.mesh.position.z - 0);
          const dxObs = Math.abs(obs.mesh.position.x - s.playerX);

          if (dz < 0.9 && dxObs < 0.9) {
            let cleared = false;
            if (obs.type === "cord" && s.playerY > 0.4) {
              cleared = true;
            } else if (obs.type === "table" && s.isSliding && s.playerY <= 0.2) {
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

        for (let j = activeDust.length - 1; j >= 0; j--) {
          const d = activeDust[j];
          d.mesh.position.z += s.speed * dt;
          d.mesh.rotation.y += dt * 3;

          const distZ = Math.abs(d.mesh.position.z - 0);
          const distX = Math.abs(d.mesh.position.x - s.playerX);

          if (s.magnetTime > 0 && d.mesh.position.z > -10 && d.mesh.position.z < 4) {
            d.mesh.position.x += (s.playerX - d.mesh.position.x) * 12 * dt;
          }

          if (distZ < 0.75 && distX < 0.8) {
            s.dustCount += 1;
            playDustChime(Math.min(12, s.dustCount));
            scene.remove(d.mesh);
            activeDust.splice(j, 1);
            setHudStats((prev) => ({ ...prev, dust: s.dustCount }));
            onDustCollect?.(s.dustCount);
            continue;
          }

          if (d.mesh.position.z > 8) {
            scene.remove(d.mesh);
            activeDust.splice(j, 1);
          }
        }

        setHudStats((prev) => ({
          ...prev,
          distance: s.distance,
          magnetTime: Math.round(s.magnetTime * 10) / 10,
        }));
        onDistanceChange?.(s.distance);
      }

      const targetCamX = s.playerX * 0.4;
      camera.position.x += (targetCamX - camera.position.x) * 8 * dt;

      if (s.trauma > 0) {
        s.trauma = Math.max(0, s.trauma - 2.0 * dt);
        const shakeMag = s.trauma * s.trauma * 0.4;
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y = 3.2 + (Math.random() - 0.5) * shakeMag;
      } else {
        camera.position.y = 3.2;
      }

      camera.lookAt(s.playerX * 0.15, 0.7, -14);
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
      if (container && renderer && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
  }, [onDistanceChange, onDustCollect, onGameOver, triggerJump, triggerSlide, switchLane]);

  return (
    <div className="runner-3d-wrapper">
      <div className="runner-viewport" ref={mountRef} />

      <div className="runner-hud-panel">
        <div className="runner-stat-badge">
          <span className="badge-label">DISTANCE</span>
          <span className="badge-val">{hudStats.distance}m</span>
        </div>
        <div className="runner-stat-badge">
          <span className="badge-label">DUST BUNNIES</span>
          <span className="badge-val">⭐ {hudStats.dust}</span>
        </div>
      </div>

      <div className="runner-touch-controls">
        <button className="touch-btn" onClick={() => switchLane(-1)}>⬅️ Left</button>
        <button className="touch-btn jump-btn" onClick={triggerJump}>⬆️ Jump</button>
        <button className="touch-btn duck-btn" onClick={triggerSlide}>⬇️ Slide</button>
        <button className="touch-btn" onClick={() => switchLane(1)}>➡️ Right</button>
      </div>

      {hudStats.isDead && (
        <div className="runner-game-over-overlay">
          <div className="game-over-dialog">
            <h2>💥 CRASH!</h2>
            <p>The Roomba hit a domestic hazard!</p>
            <div className="dialog-stats">
              <div>Distance: <strong>{hudStats.distance}m</strong></div>
              <div>Dust Bunnies: <strong>⭐ {hudStats.dust}</strong></div>
            </div>
            <button className="run-again-btn" onClick={restartRun}>
              🧹 RUN AGAIN (Space)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
