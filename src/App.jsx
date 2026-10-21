import React, { useState, useEffect } from "react";
import { RunnerScene } from "./components/3d/RunnerScene";
import { RunnerHUD } from "./components/3d/RunnerHUD";
import { audioEngine } from "./utils/audioEngine";

export default function App() {
  const [gameKey, setGameKey] = useState(0);
  const [distance, setDistance] = useState(0);
  const [dustCount, setDustCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [activeMagnet, setActiveMagnet] = useState(false);
  const [magnetTimeLeft, setMagnetTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(() => audioEngine.isMuted);

  // Magnet timer countdown
  useEffect(() => {
    if (!activeMagnet) return;
    const interval = setInterval(() => {
      setMagnetTimeLeft((prev) => {
        if (prev <= 0.1) {
          setActiveMagnet(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeMagnet]);

  // Restart listener on Space key during game over
  useEffect(() => {
    function handleKeyDown(e) {
      if (isGameOver && e.code === "Space") {
        e.preventDefault();
        handleRestart();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameOver]);

  function handleGameOver() {
    setIsGameOver(true);
    setActiveMagnet(false);
  }

  function handleUpdateStats({ distance: newDist, addDust }) {
    if (newDist !== undefined) setDistance(newDist);
    if (addDust) setDustCount((prev) => prev + addDust);
  }

  function handleActivateMagnet() {
    setActiveMagnet(true);
    setMagnetTimeLeft(8.0);
  }

  function handleRestart() {
    setDistance(0);
    setDustCount(0);
    setActiveMagnet(false);
    setMagnetTimeLeft(0);
    setIsGameOver(false);
    setGameKey((prev) => prev + 1);
  }

  function handleToggleMute() {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <RunnerScene
        key={gameKey}
        isGameOver={isGameOver}
        onGameOver={handleGameOver}
        onUpdateStats={handleUpdateStats}
        activeMagnet={activeMagnet}
        onActivateMagnet={handleActivateMagnet}
      />

      <RunnerHUD
        distance={distance}
        dustCount={dustCount}
        activeMagnet={activeMagnet}
        magnetTimeLeft={magnetTimeLeft}
        isGameOver={isGameOver}
        onRestart={handleRestart}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
