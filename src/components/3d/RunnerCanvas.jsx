import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { playDustChime, playImpactThud, playDockChime } from "../../utils/audioSynth";

const LANE_WIDTH = 2.2;
const CHUNK_LENGTH = 40;
const INITIAL_SPEED = 14;

export function RunnerCanvas({ onDistanceChange, onDustCollect, onGameOver }) {
  const mountRef = useRef(null);
  const restartRef = useRef(null);

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
    invincibleTimer: 2.0, // 2s invincibility on start
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
      s.velocityY = 7.8;
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

  const handleRestart = useCallback(() => {
    if (restartRef.current) {
      restartRef.current();
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
    scene.fog = new THREE.Fog("#fef3c7", 18, 80);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.2);

    const ambientLight = new THREE.AmbientLight("#ffffff", 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight("#fffbeb", 1.25);
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

    // Bumper
    const bumperGeo = new THREE.BoxGeometry(0.9, 0.14, 0.25);
    const bumperMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.8 });
    const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat);
    bumperMesh.position.set(0, 0.09, -0.45);
    roombaGroup.add(bumperMesh);

    // Glossy Cyan Turret
    const turretGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24);
    const turretMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.2, metalness: 0.6 });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.set(0, 0.22, -0.05);
    roombaGroup.add(turretMesh);

    // Emerald LED
    const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 2.5 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0, 0.27, -0.05);
    roombaGroup.add(ledMesh);

    // Brushes
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
      // Safe runway: never spawn hazards in the first 45 meters
      if (chunkZ > -45) {
        // Only spawn welcome dust bunnies on runway
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
        // Ground Cord -> Jump required
        obsMesh = new THREE.Mesh(cordGeo, cordMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.11, chunkZ - 18);
        typeStr = "cord";
      } else if (obsType < 0.7) {
        // Low Coffee Table -> Duck required
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
        // Cardboard Box -> Lane switch required
        obsMesh = new THREE.Mesh(boxGeo, boxMat);
        obsMesh.position.set(obsLane * LANE_WIDTH, 0.9, chunkZ - 22);
        typeStr = "box";
      }

      obsMesh.castShadow = true;
      scene.add(obsMesh);
      activeObstacles.push({ mesh: obsMesh, lane: obsLane, type: typeStr });

      // Spawn Dust in alternate lane
      const dustLane = lanes[1];
      for (let j = 0; j < 4; j++) {
        const dMesh = new THREE.Mesh(dustGeo, dustMat);
        dMesh.position.set(dustLane * LANE_WIDTH, 0.3, chunkZ - 8 - j * 3.5);
        scene.add(dMesh);
        activeDust.push({ mesh: dMesh });
      }
    }

    // Populate track with safe starting layout
    trackChunks.forEach((c) => {
      spawnChunkContent(c.z);
    });

    // Provide robust restart runner
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

      // Reset chunks
      trackChunks.forEach((c, idx) => {
        c.group.position.z = -idx * CHUNK_LENGTH;
        spawnChunkContent(c.group.position.z);
      });

      setHudStats({ distance: 0, dust: 0, magnetTime: 0, isDead: false });
      playDockChime();
    };

    // 6. Keyboard input listener with preventDefault
    const handleKey = (e) => {
      const k = e.key ? e.key.toLowerCase() : "";
      const s = stateRef.current;

      // Prevent window scroll / back navigation on game keys
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

    // 7. Animation Game Loop
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

      if (!s.isDead) {
        s.distance += Math.round(s.speed * dt);
        s.speed = Math.min(26, s.speed + 0.12 * dt);

        if (s.invincibleTimer > 0) {
          s.invincibleTimer -= dt;
        }

        // Horizontal lane lerping with NaN protection
        const targetX = isNaN(s.targetX) ? 0 : s.targetX;
        let currentX = isNaN(s.playerX) ? 0 : s.playerX;
        const dx = targetX - currentX;
        currentX += dx * 16 * dt;
        s.playerX = currentX;

        // Vertical jump physics
        if (s.isJumping) {
          s.velocityY -= 26 * dt;
          s.playerY += s.velocityY * dt;
          if (s.playerY <= 0.1) {
            s.playerY = 0.1;
            s.velocityY = 0;
            s.isJumping = false;
          }
        }

        // Suction slide
        if (s.isSliding) {
          s.slideTimer -= dt;
          if (s.slideTimer <= 0) {
            s.isSliding = false;
          }
        }

        if (s.magnetTime > 0) {
          s.magnetTime = Math.max(0, s.magnetTime - dt);
        }

        // Update Roomba mesh
        roombaGroup.position.set(currentX, s.playerY, 0);

        const rollAngle = -dx * 0.08;
        roombaGroup.rotation.z = isNaN(rollAngle) ? 0 : rollAngle;

        const scaleY = s.isSliding ? 0.45 : s.isJumping ? 1.2 : 1.0;
        roombaGroup.scale.set(1.0, scaleY, 1.0);

        brushLeft.rotation.y += dt * 18;
        brushRight.rotation.y -= dt * 18;

        // Ground shadow
        shadowMesh.position.x = currentX;
        const shadowScale = Math.max(0.3, 1.0 - (s.playerY - 0.1) * 0.6);
        shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
        shadowMat.opacity = Math.max(0.1, 0.45 - (s.playerY - 0.1) * 0.25);

        // Track chunk recycling
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

        // Obstacles movement & collision
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
          const obs = activeObstacles[i];
          obs.mesh.position.z += s.speed * dt;

          const dz = Math.abs(obs.mesh.position.z - 0);
          const dxObs = Math.abs(obs.mesh.position.x - currentX);

          // Test AABB overlap only when player is not invincible
          if (s.invincibleTimer <= 0 && dz < 0.85 && dxObs < 0.8) {
            let cleared = false;
            if (obs.type === "cord" && s.playerY > 0.4) {
              cleared = true; // Cleared by jump
            } else if (obs.type === "table" && s.isSliding && s.playerY <= 0.25) {
              cleared = true; // Cleared by duck
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

        // Throttle HUD and parent updates to 5 times/sec (200ms) to prevent render thrashing
        if (currentTime - lastHudSyncTime > 200) {
          lastHudSyncTime = currentTime;
          setHudStats((prev) => ({
            ...prev,
            distance: s.distance,
            magnetTime: Math.round(s.magnetTime * 10) / 10,
          }));
          onDistanceChange?.(s.distance);
        }
      }

      // Camera Follow Rig & Centrifugal Banking
      const targetCamX = (isNaN(s.playerX) ? 0 : s.playerX) * 0.4;
      camera.position.x += (targetCamX - camera.position.x) * 8 * dt;

      if (s.trauma > 0) {
        s.trauma = Math.max(0, s.trauma - 2.0 * dt);
        const shakeMag = s.trauma * s.trauma * 0.35;
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y = 3.2 + (Math.random() - 0.5) * shakeMag;
      } else {
        camera.position.y = 3.2;
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
  }, []); // Mount ONCE - no re-mounting when parent re-renders!

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
        <button className="touch-btn" onClick={() => switchLane(-1)}>⬅️ Left (A)</button>
        <button className="touch-btn jump-btn" onClick={triggerJump}>⬆️ Jump (W)</button>
        <button className="touch-btn duck-btn" onClick={triggerSlide}>⬇️ Slide (S)</button>
        <button className="touch-btn" onClick={() => switchLane(1)}>➡️ Right (D)</button>
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
            <button className="run-again-btn" onClick={handleRestart}>
              🧹 RUN AGAIN (Space)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
