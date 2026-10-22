import React from "react";

export function JuiceInspector({
  onTriggerTrauma,
  onTriggerHitstop,
  onTriggerSquash,
  onTriggerImpact,
  onTestGLTFLoad,
  gltfLoading,
  gltfResult,
}) {
  return (
    <div className="juice-inspector-panel" data-testid="juice-inspector">
      <div className="inspector-title">
        <span>🎮 Interactive Tactile Juice & Blender 3D Suite</span>
      </div>
      <div className="inspector-buttons">
        <button
          className="juice-action-btn trauma-btn"
          onClick={() => onTriggerTrauma(0.8)}
          title="Kick camera trauma to 0.8 with quadratic Perlin shake"
        >
          💥 Camera Shake (Trauma)
        </button>
        <button
          className="juice-action-btn hitstop-btn"
          onClick={() => onTriggerHitstop(60)}
          title="Trigger a 60ms physics & engine freeze-frame"
        >
          ⏸️ 60ms Hitstop Micro-Pause
        </button>
        <button
          className="juice-action-btn squash-btn"
          onClick={() => onTriggerSquash("land")}
          title="Trigger vertical squash (0.8x) and spring settle"
        >
          🍮 Squash & Stretch Impulse
        </button>
        <button
          className="juice-action-btn combo-btn"
          onClick={() => onTriggerImpact("heavy")}
          title="Combined Heavy Crash Impact: Freeze + Trauma + Squash"
        >
          🚀 Full Crash Impact Suite
        </button>
      </div>

      <div className="gltf-benchmark-row">
        <button
          className="gltf-load-btn"
          onClick={onTestGLTFLoad}
          disabled={gltfLoading}
        >
          {gltfLoading ? "⏳ Decompressing Draco GLB..." : "📦 Stream Blender .GLB Model"}
        </button>
        {gltfResult && (
          <div className="gltf-result-badge">
            ✅ {gltfResult.metadata.generator} | Unpacked: {gltfResult.unpackTimeMs}ms | Triangles: {gltfResult.metadata.triangles}
          </div>
        )}
      </div>
    </div>
  );
}
