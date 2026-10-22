import React from "react";

export function ParticleBurst({ particles }) {
  if (!particles || particles.length === 0) return null;

  return (
    <div className="particle-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`particle particle-${p.type}`}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            transform: `translate(${p.dx}px, ${p.dy}px) scale(${p.scale})`,
            opacity: p.opacity,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
