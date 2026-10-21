import React from "react";
import "./RunnerHUD.css";

export function RunnerHUD({
  distance = 0,
  dustCount = 0,
  activeMagnet = false,
  magnetTimeLeft = 0,
  isGameOver = false,
  onRestart,
  isMuted = false,
  onToggleMute
}) {
  return (
    <div className="runner-hud-overlay">
      {/* Top Header Metrics */}
      <header className="runner-hud-header">
        <div className="runner-stat-badge">
          <span className="stat-label">DISTANCE</span>
          <span className="stat-value" data-testid="distance-stat">{distance}m</span>
        </div>

        <div className="runner-title">
          <h1>ROOMBA ZOOMBA 3D 🧹</h1>
        </div>

        <div className="runner-stat-badge">
          <span className="stat-label">DUST BUNNIES</span>
          <span className="stat-value" data-testid="dust-stat">⭐ {dustCount}</span>
        </div>

        <button
          className="sound-toggle-btn"
          onClick={onToggleMute}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </header>

      {/* Magnet Active Timer Bar */}
      {activeMagnet && (
        <div className="magnet-timer-card">
          <div className="magnet-label">⚡ VACUUM MAGNET ACTIVE!</div>
          <div className="magnet-bar-track">
            <div
              className="magnet-bar-fill"
              style={{ width: `${Math.max(0, (magnetTimeLeft / 8) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Controls Hint */}
      {!isGameOver && (
        <div className="runner-controls-footer">
          <span>
            ⌨️ <strong>A / D</strong> or <strong>← / →</strong>: Switch Lane &nbsp;|&nbsp;
            <strong>W / ↑</strong> or <strong>Space</strong>: Jump &nbsp;|&nbsp;
            <strong>S / ↓</strong>: Slide &nbsp;|&nbsp;
            📱 Swipe on Mobile
          </span>
        </div>
      )}

      {/* Game Over Dialog */}
      {isGameOver && (
        <div className="game-over-modal-backdrop" data-testid="gameover-modal">
          <div className="game-over-modal-card">
            <div className="crash-icon">💥</div>
            <h2>ROOMBA CRASHED!</h2>
            <p className="crash-subtitle">You bumped into a domestic hazard!</p>

            <div className="results-summary">
              <div className="result-item">
                <span className="res-label">DISTANCE RUN</span>
                <span className="res-value">{distance} meters</span>
              </div>
              <div className="result-item">
                <span className="res-label">DUST VACUUMED</span>
                <span className="res-value">⭐ {dustCount}</span>
              </div>
            </div>

            <button className="restart-run-btn" onClick={onRestart}>
              🧹 RUN AGAIN (Space)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
