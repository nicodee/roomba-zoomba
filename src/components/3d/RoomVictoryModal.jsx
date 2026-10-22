import React, { useEffect } from "react";

export function RoomVictoryModal({
  roomName,
  nextRoomName,
  cleanTimeSeconds,
  dustCollected,
  quota,
  batteryRemaining,
  coinsEarned,
  onProceed,
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onProceed();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onProceed]);

  return (
    <div className="room-victory-overlay" data-testid="room-victory-modal">
      <div className="room-victory-card">
        <div className="victory-icon-ring">✨ 🧹 ✨</div>
        <h2 className="victory-title">ROOM 100% CLEANED!</h2>
        <p className="victory-subtitle">{roomName.toUpperCase()} MISSION COMPLETE</p>

        <div className="victory-stats-grid">
          <div className="victory-stat-item">
            <span className="stat-label">CLEAN TIME</span>
            <span className="stat-val">{cleanTimeSeconds}s</span>
          </div>
          <div className="victory-stat-item">
            <span className="stat-label">DUST VACUUMED</span>
            <span className="stat-val">⭐ {dustCollected}/{quota}</span>
          </div>
          <div className="victory-stat-item">
            <span className="stat-label">BATTERY LEFT</span>
            <span className="stat-val">{batteryRemaining}% ⚡</span>
          </div>
          <div className="victory-stat-item highlight-coin">
            <span className="stat-label">COINS EARNED</span>
            <span className="stat-val">🪙 +{coinsEarned}</span>
          </div>
        </div>

        <button
          className="proceed-room-btn"
          onClick={onProceed}
          data-testid="proceed-room-btn"
        >
          ENTER {nextRoomName ? nextRoomName.toUpperCase() : "NEXT ROOM"} 🚪 (Space)
        </button>
      </div>
    </div>
  );
}
