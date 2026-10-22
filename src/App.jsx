import React, { useState, useEffect, useRef, useCallback, Component } from "react";
import "./App.css";
import { RunnerCanvas } from "./components/3d/RunnerCanvas";
import { useJuice } from "./hooks/useJuice";
import { ParticleBurst } from "./components/ParticleBurst";
import { HUD } from "./components/HUD";
import { JuiceInspector } from "./components/JuiceInspector";
import { ModelViewer3D } from "./components/ModelViewer3D";
import { assetManager } from "./utils/gltfLoader";
import {
  playDustChime,
  playImpactThud,
  playMoveWhir,
  playDockChime,
  toggleMute,
  getIsMuted,
} from "./utils/audioSynth";

class SafeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Caught in ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback-card">
          <h3>⚠️ Viewport Error</h3>
          <p>{this.state.error?.message || "An unexpected error occurred."}</p>
          <button onClick={() => this.setState({ hasError: false })}>Reload 3D View</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const INITIAL_DUST_TILES = [
  { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 }, { x: 5, y: 2 },
  { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 8, y: 3 }, { x: 1, y: 7 },
  { x: 5, y: 8 }, { x: 8, y: 9 }, { x: 4, y: 7 }, { x: 0, y: 5 },
  { x: 6, y: 2 }, { x: 2, y: 8 }, { x: 7, y: 4 }, { x: 9, y: 5 }
];

const INITIAL_BLOCKERS = [
  { x: 7, y: 8 },
  { x: 4, y: 3 },
  { x: 9, y: 0 },
  { x: 6, y: 6 },
];

function isCellAnObstacle(obstacles, cell) {
  return obstacles.some((obs) => obs.x === cell.x && obs.y === cell.y);
}

function Cell({ position, roombaPosition, direction, blockers, dustTiles, deformation }) {
  const isBlocker = isCellAnObstacle(blockers, position);
  const isRoombaHere = position.x === roombaPosition.x && position.y === roombaPosition.y;
  const isDock = position.x === 0 && position.y === 0;
  const hasDust = dustTiles?.some((d) => d.x === position.x && d.y === position.y);

  return (
    <div
      className={`Cell ${isDock ? "dock-cell" : ""} ${hasDust ? "dust-cell" : ""}`}
      data-x={position.x}
      data-y={position.y}
    >
      {isBlocker ? (
        <span role="img" aria-label="obstacle" className="obstacle">
          🙅‍♂️
        </span>
      ) : isRoombaHere ? (
        <Roomba direction={direction} deformation={deformation} />
      ) : hasDust ? (
        <span role="img" aria-label="dust" className="dust-bunny">
          💨
        </span>
      ) : isDock ? (
        <span role="img" aria-label="dock" className="dock-icon">
          ⚡
        </span>
      ) : null}
    </div>
  );
}

function createColumn(i, roombaPosition, direction, blockers, dustTiles, deformation) {
  const cells = [];
  for (let j = 0; j < 10; j++) {
    cells.push(
      <Cell
        position={{ x: i, y: j }}
        key={`${i}-${j}`}
        roombaPosition={roombaPosition}
        direction={direction}
        blockers={blockers}
        dustTiles={dustTiles}
        deformation={deformation}
      />
    );
  }
  return (
    <div className="Column" key={i}>
      {cells}
    </div>
  );
}

function Grid({ roombaPosition, direction, blockers, dustTiles, deformation }) {
  const columns = [];
  for (let i = 0; i < 10; i++) {
    columns.push(createColumn(i, roombaPosition, direction, blockers, dustTiles, deformation));
  }
  return <div className="Grid" data-testid="game-grid">{columns}</div>;
}

function Roomba({ direction, deformation }) {
  const deformStyle = deformation
    ? {
        transform: `scale(${deformation.scaleX}, ${deformation.scaleY}) rotate(${deformation.rotationDeg}deg)`,
        transition: deformation.isSquashing ? "none" : "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }
    : {};

  return (
    <div className="Roomba" style={deformStyle}>
      <span role="img" aria-label="roomba" className={direction}>
        👉
      </span>
      <span className="roomba-underglow" />
    </div>
  );
}

function App() {
  const [activeMode, setActiveMode] = useState("3d");

  // 2D State
  const [roombaPosition, setRoombaPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState("right");
  const [blockers] = useState(INITIAL_BLOCKERS);
  const [dustTiles, setDustTiles] = useState(INITIAL_DUST_TILES);
  const [score, setScore] = useState(0);
  const [cleanedCount, setCleanedCount] = useState(0);
  const [battery, setBattery] = useState(100);
  const [streak, setStreak] = useState(0);
  const [particles, setParticles] = useState([]);
  const [muted, setMuted] = useState(getIsMuted());

  // GLTF benchmark state
  const [gltfLoading, setGltfLoading] = useState(false);
  const [gltfResult, setGltfResult] = useState(null);

  const gridContainerRef = useRef(null);
  const streakTimerRef = useRef(null);

  const {
    trauma,
    cameraShake,
    deformation,
    isHitstopActive,
    addTrauma,
    triggerHitstop,
    triggerSquashStretch,
    triggerCollisionImpact,
  } = useJuice();

  const spawnParticles = useCallback((gridPos, type = "dust") => {
    if (!gridContainerRef.current) return;
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 10;
    const cellHeight = gridRect.height / 10;
    const centerX = gridPos.x * cellWidth + cellWidth / 2;
    const centerY = gridPos.y * cellHeight + cellHeight / 2;

    const count = type === "dust" ? 5 : 8;
    const newParticles = [];
    const glyphs = type === "dust" ? ["✨", "💨", "⭐", "🔹"] : ["💥", "⚡", "🔥", "💢"];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const dist = 18 + Math.random() * 24;
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        type,
        x: centerX,
        y: centerY,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        scale: 0.6 + Math.random() * 0.6,
        opacity: 1,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 600);
  }, []);

  const handleTurnRight = useCallback(() => {
    if (isHitstopActive) return;

    triggerSquashStretch("turnRight");
    playMoveWhir();

    setDirection((prev) => {
      switch (prev) {
        case "right":
          return "down";
        case "down":
          return "left";
        case "left":
          return "up";
        case "up":
          return "right";
        default:
          return "right";
      }
    });
  }, [isHitstopActive, triggerSquashStretch]);

  const handleTurnLeft = useCallback(() => {
    if (isHitstopActive) return;

    triggerSquashStretch("turnLeft");
    playMoveWhir();

    setDirection((prev) => {
      switch (prev) {
        case "right":
          return "up";
        case "up":
          return "left";
        case "left":
          return "down";
        case "down":
          return "right";
        default:
          return "left";
      }
    });
  }, [isHitstopActive, triggerSquashStretch]);

  const handleMoveForward = useCallback(() => {
    if (isHitstopActive) return;

    let targetX = roombaPosition.x;
    let targetY = roombaPosition.y;

    switch (direction) {
      case "right":
        targetX += 1;
        break;
      case "left":
        targetX -= 1;
        break;
      case "up":
        targetY -= 1;
        break;
      case "down":
        targetY += 1;
        break;
      default:
        break;
    }

    const isOutOfBounds = targetX < 0 || targetX > 9 || targetY < 0 || targetY > 9;
    const isBlocked = !isOutOfBounds && isCellAnObstacle(blockers, { x: targetX, y: targetY });

    if (isOutOfBounds || isBlocked) {
      triggerCollisionImpact("heavy");
      playImpactThud();
      spawnParticles(roombaPosition, "spark");
      setStreak(0);
      return;
    }

    triggerSquashStretch("move");
    playMoveWhir();

    const newPos = { x: targetX, y: targetY };
    setRoombaPosition(newPos);
    setBattery((prev) => Math.max(0, prev - 1));

    if (newPos.x === 0 && newPos.y === 0) {
      setBattery(100);
      playDockChime();
      spawnParticles(newPos, "spark");
    }

    const dustIndex = dustTiles.findIndex((d) => d.x === newPos.x && d.y === newPos.y);
    if (dustIndex !== -1) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const points = 10 * nextStreak;
      setScore((prev) => prev + points);
      setCleanedCount((prev) => prev + 1);

      setDustTiles((prev) => prev.filter((_, idx) => idx !== dustIndex));
      playDustChime(nextStreak);

      if (nextStreak % 5 === 0) {
        triggerHitstop(40);
        addTrauma(0.3);
      }

      spawnParticles(newPos, "dust");

      if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
      streakTimerRef.current = setTimeout(() => {
        setStreak(0);
      }, 3500);
    }
  }, [
    isHitstopActive,
    roombaPosition,
    direction,
    blockers,
    dustTiles,
    streak,
    triggerCollisionImpact,
    triggerSquashStretch,
    triggerHitstop,
    addTrauma,
    spawnParticles,
  ]);

  useEffect(() => {
    if (activeMode !== "2d") return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "d") {
        if (direction !== "right") {
          setDirection("right");
          triggerSquashStretch("turnRight");
        } else {
          handleMoveForward();
        }
      } else if (key === "arrowleft" || key === "a") {
        if (direction !== "left") {
          setDirection("left");
          triggerSquashStretch("turnLeft");
        } else {
          handleMoveForward();
        }
      } else if (key === "arrowup" || key === "w") {
        if (direction !== "up") {
          setDirection("up");
          triggerSquashStretch("jump");
        } else {
          handleMoveForward();
        }
      } else if (key === "arrowdown" || key === "s") {
        if (direction !== "down") {
          setDirection("down");
          triggerSquashStretch("land");
        } else {
          handleMoveForward();
        }
      } else if (key === " ") {
        handleMoveForward();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMode, direction, handleMoveForward, triggerSquashStretch]);

  const handleResetRun = () => {
    setRoombaPosition({ x: 0, y: 0 });
    setDirection("right");
    setDustTiles(INITIAL_DUST_TILES);
    setScore(0);
    setCleanedCount(0);
    setBattery(100);
    setStreak(0);
    playDockChime();
  };

  const handleToggleSound = () => {
    const nextMuted = toggleMute();
    setMuted(nextMuted);
  };

  const handleTestGLTFLoad = async () => {
    setGltfLoading(true);
    try {
      const model = await assetManager.load("/models/roomba.glb", {
        mockBuffer: new ArrayBuffer(2048),
      });
      setGltfResult(model);
      playDustChime(5);
    } catch (e) {
      console.error(e);
    } finally {
      setGltfLoading(false);
    }
  };

  return (
    <div className={`App ${isHitstopActive ? "engine-hitstop-freeze" : ""}`}>
      <header className="game-header">
        <h1 className="game-title">
          🧹 ROOMBA ZOOMBA <span className="juice-badge">3D ENDLESS RUNNER</span>
        </h1>
        <p className="game-subtitle">
          Subway Surfers meets domestic vacuuming! Dodge power cords, duck under coffee tables, and collect glowing dust!
        </p>

        {/* Mode Switcher Tabs */}
        <div className="mode-switcher-bar">
          <button
            className={`mode-tab-btn ${activeMode === "3d" ? "active-tab" : ""}`}
            onClick={() => setActiveMode("3d")}
          >
            🏎️ 3D Endless Runner
          </button>
          <button
            className={`mode-tab-btn ${activeMode === "2d" ? "active-tab" : ""}`}
            onClick={() => setActiveMode("2d")}
          >
            🧹 2D Classic Sweeper
          </button>
        </div>
      </header>

      {/* 3D ENDLESS RUNNER VIEW */}
      {activeMode === "3d" && (
        <SafeErrorBoundary>
          <div className="runner-3d-container">
            <RunnerCanvas />

            <div className="runner-secondary-stage">
              <ModelViewer3D
                deformation={deformation}
                isHitstopActive={isHitstopActive}
                cameraShake={cameraShake}
              />

              <JuiceInspector
                onTriggerTrauma={(amt) => addTrauma(amt)}
                onTriggerHitstop={(ms) => triggerHitstop(ms)}
                onTriggerSquash={(type) => triggerSquashStretch(type)}
                onTriggerImpact={(sev) => triggerCollisionImpact(sev)}
                onTestGLTFLoad={handleTestGLTFLoad}
                gltfLoading={gltfLoading}
                gltfResult={gltfResult}
              />
            </div>
          </div>
        </SafeErrorBoundary>
      )}

      {/* 2D CLASSIC SWEEPER VIEW */}
      <div
        className="sweeper-2d-container"
        style={{ display: activeMode === "2d" ? "block" : "none" }}
      >
        <HUD
          score={score}
          cleanedCount={cleanedCount}
          totalDust={INITIAL_DUST_TILES.length}
          battery={battery}
          streak={streak}
          trauma={trauma}
          isHitstopActive={isHitstopActive}
          deformation={deformation}
          isMuted={muted}
          onToggleMute={handleToggleSound}
          onReset={handleResetRun}
        />

        <div className="buttons">
          <button onClick={handleTurnLeft} className="action-btn turn-left-btn">
            ↺ Turn Left
          </button>
          <button onClick={handleTurnRight} className="action-btn turn-right-btn">
            Turn Right
          </button>
          <button onClick={handleMoveForward} className="action-btn move-forward-btn">
            Move Forward
          </button>
        </div>

        <br />

        <div className="board-wrapper" ref={gridContainerRef}>
          <ParticleBurst particles={particles} />
          <Grid
            roombaPosition={roombaPosition}
            direction={direction}
            blockers={blockers}
            dustTiles={dustTiles}
            deformation={deformation}
          />
        </div>
      </div>

      <br />
      <footer className="game-footer">
        <a href="https://github.com/nicodee/roomba-zoomba" target="blank" rel="noreferrer">
          Link to repo on Github
        </a>
      </footer>
    </div>
  );
}

export default App;
