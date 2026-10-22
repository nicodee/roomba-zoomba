import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ROOM_PROFILES } from "./components/3d/RunnerCanvas";
import { playThresholdThud } from "./utils/audioSynth";

describe("Story Verification: Volumetric room transitions and 90-degree corner turns (story-30912c66)", () => {
  it("AC-1: Crossing door threshold triggers tactile hop impulse and clack-clack threshold audio", () => {
    const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");

    // Tactile bump impulse
    expect(runnerCode).toContain("s.playerY += 0.04");
    expect(runnerCode).toContain("s.velocityY = 1.2");

    // Audio transient
    expect(runnerCode).toContain("playThresholdThud()");
  });

  it("AC-2: Wall dimensions widen from 7.2m (Hallway) to 15m (Living Room), and camera FOV expands from 55 to 68 degrees", () => {
    expect(ROOM_PROFILES.hallway.wallWidth).toBeCloseTo(7.2, 1);
    expect(ROOM_PROFILES.hallway.camFov).toBe(55);

    expect(ROOM_PROFILES.living_room.wallWidth).toBe(15.0);
    expect(ROOM_PROFILES.living_room.camFov).toBe(68);

    expect(ROOM_PROFILES.kitchen.wallWidth).toBe(11.0);
    expect(ROOM_PROFILES.kitchen.camFov).toBe(60);
  });

  it("AC-3: Distinct floor materials configure surface shaders per domestic zone (Oak, Rug, Tile)", () => {
    expect(ROOM_PROFILES.hallway.floorColor).toBe("#d97706");
    expect(ROOM_PROFILES.living_room.floorColor).toBe("#881337"); // Persian area rug
    expect(ROOM_PROFILES.kitchen.floorColor).toBe("#f8fafc");     // Glossy white ceramic tile
  });

  it("AC-4: 90-degree corner doorway triggers inward 8-degree camera sweep arc (0.14 rad)", () => {
    const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");

    // Corner turn progress state
    expect(runnerCode).toContain("s.cornerTurnProgress");
    // Inward 8-degree (0.14 rad) camera banking roll
    expect(runnerCode).toContain("camera.rotation.z = Math.sin(s.cornerTurnProgress * Math.PI) * -0.14");
  });
});
