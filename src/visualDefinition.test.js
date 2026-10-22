import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { runAssetPipeline } from "../scripts/blender/build_assets.js";

describe("Visual Definition & PBR Refinement Verification", () => {
  describe("Story 1: High-definition procedural Roomba hero model (story-7158e046)", () => {
    it("AC-1 & AC-2: Verifies beveled specular rim and recessed panel shutline geometries in 3D scene", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      // Beveled rim torus
      expect(runnerCode).toContain("TorusGeometry(0.65, 0.025, 16, 48)");
      // Recessed shutline seam
      expect(runnerCode).toContain("TorusGeometry(0.52, 0.012, 12, 48)");
      expect(runnerCode).toContain("#090d16");
    });

    it("AC-3 & AC-4: Verifies glowing cyan halo LED clean button and LiDAR optic chamber", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      // Halo LED button
      expect(runnerCode).toContain("haloGeo");
      expect(runnerCode).toContain("emissiveIntensity: 3.0");
      // LiDAR optics & laser diode
      expect(runnerCode).toContain("opticGeo");
      expect(runnerCode).toContain("diodeGeo");
      expect(runnerCode).toContain("#ef4444");
    });

    it("AC-5: Verifies twin forward headlights / spotlight beams illuminating the track ahead", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      expect(runnerCode).toContain("SpotLight");
      expect(runnerCode).toContain("createHeadlight(-0.28)");
      expect(runnerCode).toContain("createHeadlight(0.28)");
    });
  });

  describe("Story 2: Refine Roomba PBR materials and underglow (story-aa68f8fd)", () => {
    it("AC-1 & AC-2: Multi-tier PBR surface contrast (brushed gunmetal metalness 0.75, matte rubber bumper)", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      // Brushed aluminum/gunmetal faceplate
      expect(runnerCode).toContain("metalness: 0.75");
      expect(runnerCode).toContain("roughness: 0.35");
      // Matte rubber bumper
      expect(runnerCode).toContain("roughness: 0.85");
      expect(runnerCode).toContain("metalness: 0.05");
    });

    it("AC-3: Verifies dynamic cyan LED ground underglow point light casting floor illumination", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      expect(runnerCode).toContain("PointLight(\"#06b6d4\", 1.8, 3.5, 2.0)");
      expect(runnerCode).toContain("roombaGroup.add(underglowLight)");
    });

    it("AC-4: Verifies velocity-scaled side brush rotation", () => {
      const runnerCode = fs.readFileSync(path.resolve("src/components/3d/RunnerCanvas.jsx"), "utf-8");
      expect(runnerCode).toContain("const brushSpeed = s.speed * 1.5");
      expect(runnerCode).toContain("brushLeft.rotation.y += dt * brushSpeed");
    });
  });

  describe("Story 3: Blender high-poly sculpt and bake pipeline (story-98d6373b)", () => {
    it("AC-1 & AC-2: Python script configures Cycles 1024x1024 Normal & AO baking with Sub-D sculpting", () => {
      const pyCode = fs.readFileSync(path.resolve("scripts/blender/generate_roomba.py"), "utf-8");
      expect(pyCode).toContain("render.engine = 'CYCLES'");
      expect(pyCode).toContain("Roomba_Normal_1024");
      expect(pyCode).toContain("Roomba_AO_1024");
      expect(pyCode).toContain("type='SUBSURF'");
      expect(pyCode).toContain("type='BEVEL'");
    });

    it("AC-3 & AC-4: Asset pipeline outputs ORM baked texture metadata and validates GLB Draco compression", () => {
      const result = runAssetPipeline();
      expect(result.success).toBe(true);

      const metaPath = path.resolve("public/models/roomba_procedural.meta.json");
      expect(fs.existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

      expect(meta.dracoCompressed).toBe(true);
      expect(meta.bakedTextures.resolution).toBe("1024x1024");
      expect(meta.bakedTextures.ormMap).toBe("roomba_orm_1024.png");
      expect(meta.fileSizeKB).toBeLessThan(1500); // Under 1.5MB
    });
  });
});
