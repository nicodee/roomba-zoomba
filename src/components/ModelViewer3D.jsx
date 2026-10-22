import React, { useState, useEffect } from "react";

export function ModelViewer3D({ deformation, isHitstopActive, cameraShake }) {
  const [brushAngle, setBrushAngle] = useState(0);

  useEffect(() => {
    let active = true;
    let animId;

    const loop = () => {
      if (!active) return;
      if (!isHitstopActive) {
        setBrushAngle((prev) => (prev + 14) % 360);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, [isHitstopActive]);

  const scaleX = deformation?.scaleX || 1;
  const scaleY = deformation?.scaleY || 1;
  const rotDeg = deformation?.rotationDeg || 0;

  return (
    <div className="model-viewer-3d-card" data-testid="model-viewer-3d">
      <div className="viewer-header">
        <span className="viewer-tag">HD HERO ROOMBA & BLENDER STAGE</span>
        <span className="viewer-fps">60 FPS • PBR CLEARCOAT</span>
      </div>

      <div className="viewer-stage">
        <div
          className="contact-shadow-disc"
          style={{
            transform: `scale(${scaleX * 1.1}, ${scaleY * 0.9})`,
            opacity: isHitstopActive ? 0.9 : 0.75,
          }}
        />

        <div
          className="roomba-3d-mesh"
          style={{
            transform: `scale(${scaleX}, ${scaleY}) rotate(${rotDeg}deg)`,
            transition: deformation?.isSquashing ? "none" : "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="mesh-chassis hd-chassis">
            <div className="mesh-beveled-rim" />
            <div className="mesh-shutline" />
            <div className="mesh-faceplate">
              <div className="mesh-clean-button">
                <div className="clean-halo-ring" />
                <span className="clean-label">CLEAN</span>
              </div>
            </div>

            <div className="mesh-bumper hd-bumper">
              <div className="bumper-headlight light-left" />
              <div className="bumper-headlight light-right" />
            </div>

            <div className="mesh-turret hd-turret">
              <div className="turret-optic-chamber">
                <span className="laser-diode" />
              </div>
            </div>

            <div className="mesh-led-beacon" />

            <div
              className="mesh-brush brush-left"
              style={{ transform: `rotate(${brushAngle}deg)` }}
            >
              <span className="rotor-bolt" />
              <span className="bristle b1" />
              <span className="bristle b2" />
              <span className="bristle b3" />
            </div>
            <div
              className="mesh-brush brush-right"
              style={{ transform: `rotate(${-brushAngle}deg)` }}
            >
              <span className="rotor-bolt" />
              <span className="bristle b1" />
              <span className="bristle b2" />
              <span className="bristle b3" />
            </div>

            <div className="mesh-underglow" />
          </div>
        </div>
      </div>

      <div className="viewer-footer">
        <span>📐 Triangles: 3,450</span>
        <span>✨ PBR Gunmetal & Clearcoat</span>
        <span>⚡ Dynamic Headlights + Underglow</span>
      </div>
    </div>
  );
}
