import React from "react";

export function HUD({
  score,
  cleanedCount,
  totalDust,
  battery,
  streak,
  trauma,
  isHitstopActive,
  deformation,
  isMuted,
  onToggleMute,
  onReset,
}) {
  const cleanPercent = totalDust > 0 ? Math.round((cleanedCount / totalDust) * 100) : 100;
  const isLowBattery = battery <= 20;

  return (
    <div className="hud-container">
      <div className="hud-header">
        <div className="hud-stat-box score-card">
          <span className="stat-label">SCORE</span>
          <span className="stat-value odometer">{score}</span>
        </div>

        <div className="hud-stat-box clean-meter">
          <span className="stat-label">CLEANED {cleanPercent}%</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${cleanPercent}%` }}
            />
          </div>
        </div>

        <div className={`hud-stat-box battery-meter ${isLowBattery ? "battery-danger" : ""}`}>
          <span className="stat-label">BATTERY {battery}%</span>
          <div className="progress-track">
            <div
              className={`progress-fill ${
                isLowBattery ? "fill-danger" : battery < 50 ? "fill-warning" : "fill-healthy"
              }`}
              style={{ width: `${battery}%` }}
            />
          </div>
        </div>

        <div className="hud-actions">
          <button
            className="hud-btn sound-toggle"
            onClick={onToggleMute}
            title={isMuted ? "Unmute audio" : "Mute audio"}
            aria-label="Sound Toggle"
          >
            {isMuted ? "🔇 Muted" : "🔊 Audio On"}
          </button>
          <button
            className="hud-btn reset-btn"
            onClick={onReset}
            title="Restart run"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {streak > 1 && (
        <div className="streak-badge">
          🔥 {streak}x DUST STREAK!
        </div>
      )}

      {/* Real-time Juice Telemetry Bar */}
      <div className="juice-telemetry-strip" data-testid="juice-telemetry">
        <span className={`telemetry-item ${trauma > 0 ? "telemetry-active" : ""}`}>
          ⚡ Trauma: {Math.round(trauma * 100)}%
        </span>
        <span className={`telemetry-item ${isHitstopActive ? "telemetry-freeze" : ""}`}>
          ⏱️ Hitstop: {isHitstopActive ? "FREEZE ACTIVE" : "Normal"}
        </span>
        <span className="telemetry-item">
          📐 Squash: {deformation?.scaleX?.toFixed(2) || "1.00"}x / {deformation?.scaleY?.toFixed(2) || "1.00"}x
        </span>
      </div>
    </div>
  );
}
