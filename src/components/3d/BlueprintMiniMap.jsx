import React from "react";

export const HOUSE_ZONES = [
  {
    id: "hallway",
    name: "Entry Hallway",
    levelNumber: 1,
    startDist: 0,
    endDist: 60,
    dustQuota: 20,
    color: "#0284c7",
    doorwayAt: 60,
    nextRoom: "Grand Living Room",
  },
  {
    id: "living_room",
    name: "Grand Living Room",
    levelNumber: 2,
    startDist: 60,
    endDist: 150,
    dustQuota: 40,
    color: "#881337",
    doorwayAt: 150,
    nextRoom: "Chef's Kitchen",
  },
  {
    id: "kitchen",
    name: "Chef's Kitchen",
    levelNumber: 3,
    startDist: 150,
    endDist: 240,
    dustQuota: 35,
    color: "#10b981",
    doorwayAt: 240,
    nextRoom: "Master Patio",
  },
];

export function getCurrentZone(distance) {
  for (const zone of HOUSE_ZONES) {
    if (distance >= zone.startDist && distance < zone.endDist) {
      return zone;
    }
  }
  return HOUSE_ZONES[HOUSE_ZONES.length - 1];
}

export function BlueprintMiniMap({
  distance = 0,
  playerLane = 0,
  dustCount = 0,
  roomCleanliness = null,
  isDoorUnlocked = false,
}) {
  const currentZone = getCurrentZone(distance);
  const zoneProgress = Math.min(
    1,
    Math.max(0, (distance - currentZone.startDist) / (currentZone.endDist - currentZone.startDist))
  );

  const quota = currentZone.dustQuota || 20;
  const computedPct = Math.min(100, Math.round((dustCount / quota) * 100));
  const cleanPercent = roomCleanliness !== null && roomCleanliness !== undefined ? Math.min(100, Math.round(roomCleanliness)) : computedPct;

  const distToDoor = currentZone.doorwayAt - distance;
  const isDoorNear = distToDoor > 0 && distToDoor <= 20;

  let beaconX = 120 + playerLane * 20;
  let beaconY = 280;

  if (currentZone.id === "hallway") {
    beaconY = 290 - zoneProgress * 70;
  } else if (currentZone.id === "living_room") {
    beaconX = 120 + playerLane * 35;
    beaconY = 200 - zoneProgress * 80;
  } else if (currentZone.id === "kitchen") {
    beaconX = 115 + playerLane * 28;
    beaconY = 90 - zoneProgress * 65;
  }

  return (
    <div className="blueprint-minimap-card" data-testid="blueprint-minimap">
      <div className="blueprint-header">
        <span className="blueprint-title">📐 DOMESTIC FLOOR PLAN</span>
        <span className="blueprint-zone-tag">
          LVL {currentZone.levelNumber}: {currentZone.name.toUpperCase()}
        </span>
      </div>

      <div className="blueprint-svg-wrapper">
        <svg
          viewBox="0 0 240 320"
          className="blueprint-svg"
          aria-label="House Floor Plan Blueprint"
        >
          <defs>
            <pattern id="blueprint-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="clean-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset={`${cleanPercent}%`} stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset={`${cleanPercent}%`} stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="240" height="320" fill="#091428" />
          <rect width="240" height="320" fill="url(#blueprint-grid)" />

          {/* ZONE 3: CHEF'S KITCHEN */}
          <g className={`room-group ${currentZone.id === "kitchen" ? "active-room" : ""}`}>
            <rect
              x="30"
              y="20"
              width="180"
              height="80"
              className="room-boundary"
              fill={currentZone.id === "kitchen" ? "url(#clean-gradient)" : "rgba(16, 185, 129, 0.08)"}
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <rect x="85" y="45" width="70" height="30" fill="none" stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" />
            <text x="40" y="38" className="room-label">KITCHEN</text>
            <text x="175" y="38" className="room-pct">
              {currentZone.id === "kitchen" ? `${cleanPercent}%` : distance >= 150 ? "100%✅" : "0%"}
            </text>
          </g>

          {/* DOORWAY 2: French Door between Kitchen and Living Room */}
          <line
            x1="100"
            y1="100"
            x2="140"
            y2="100"
            stroke={currentZone.id === "living_room" && isDoorUnlocked ? "#10b981" : "#f59e0b"}
            strokeWidth="2.5"
          />
          <path d="M 100 100 A 20 20 0 0 1 120 120" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />

          {/* ZONE 2: GRAND LIVING ROOM */}
          <g className={`room-group ${currentZone.id === "living_room" ? "active-room" : ""}`}>
            <rect
              x="20"
              y="110"
              width="200"
              height="100"
              className="room-boundary"
              fill={currentZone.id === "living_room" ? "url(#clean-gradient)" : "rgba(136, 19, 55, 0.08)"}
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <rect x="50" y="130" width="140" height="60" fill="none" stroke="#f43f5e" strokeDasharray="4,4" strokeWidth="1" opacity="0.6" />
            <text x="30" y="128" className="room-label">LIVING ROOM</text>
            <text x="180" y="128" className="room-pct">
              {currentZone.id === "living_room" ? `${cleanPercent}%` : distance >= 60 ? "100%✅" : "0%"}
            </text>
          </g>

          {/* DOORWAY 1: Hallway Threshold & T-Molding */}
          <line
            x1="95"
            y1="210"
            x2="145"
            y2="210"
            stroke={currentZone.id === "hallway" && isDoorUnlocked ? "#10b981" : "#f59e0b"}
            strokeWidth="2.5"
          />
          <path d="M 145 210 A 25 25 0 0 1 120 235" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />

          {/* ZONE 1: ENTRY HALLWAY */}
          <g className={`room-group ${currentZone.id === "hallway" ? "active-room" : ""}`}>
            <rect
              x="70"
              y="220"
              width="100"
              height="80"
              className="room-boundary"
              fill={currentZone.id === "hallway" ? "url(#clean-gradient)" : "rgba(2, 132, 199, 0.08)"}
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <line x1="95" y1="225" x2="95" y2="295" stroke="rgba(255,255,255,0.2)" strokeDasharray="3,3" />
            <line x1="145" y1="225" x2="145" y2="295" stroke="rgba(255,255,255,0.2)" strokeDasharray="3,3" />
            <text x="78" y="238" className="room-label">ENTRY HALL</text>
            <text x="140" y="238" className="room-pct">
              {currentZone.id === "hallway" ? `${cleanPercent}%` : "100%✅"}
            </text>
          </g>

          {/* DOORWAY RADAR PROXIMITY PING */}
          {isDoorNear && (
            <g className="radar-door-ping" data-testid="radar-door-ping">
              <circle
                cx={120}
                cy={currentZone.id === "hallway" ? 210 : 100}
                r="12"
                fill="none"
                stroke={isDoorUnlocked ? "#10b981" : "#f59e0b"}
                strokeWidth="2"
              >
                <animate attributeName="r" from="4" to="16" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="1" to="0" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <text
                x="120"
                y={currentZone.id === "hallway" ? 204 : 94}
                className="radar-ping-text"
                textAnchor="middle"
                fill={isDoorUnlocked ? "#10b981" : "#f59e0b"}
              >
                {isDoorUnlocked ? `DOOR UNLOCKED (${Math.round(distToDoor)}m)` : `THRESHOLD IN ${Math.round(distToDoor)}m!`}
              </text>
            </g>
          )}

          {/* REAL-TIME ROOMBA PLAYER BEACON */}
          <g
            className="player-beacon-group"
            style={{ transform: `translate(${beaconX}px, ${beaconY}px)` }}
            data-testid="player-beacon"
          >
            <circle cx="0" cy="0" r="8" fill="rgba(6, 182, 212, 0.4)">
              <animate attributeName="r" from="4" to="14" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            <polygon points="0,-7 3,-3 -3,-3" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="blueprint-footer">
        <div className="footer-metric">
          <span className="metric-lbl">ACTIVE CLEANLINESS</span>
          <span className="metric-val">{cleanPercent}%</span>
        </div>
        <div className="footer-metric">
          <span className="metric-lbl">DOOR STATUS</span>
          <span className={`metric-val ${isDoorUnlocked ? "door-open" : "door-locked"}`}>
            {isDoorUnlocked ? "UNLOCKED 🟢" : "CLEANING 🔒"}
          </span>
        </div>
      </div>
    </div>
  );
}
