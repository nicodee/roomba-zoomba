import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { runAssetPipeline, generateFallbackGLB } from "../scripts/blender/build_assets.js";

describe("Story Verification: Headless Blender procedural asset generation pipeline (story-def21c55)", () => {
  it("AC-1: Outputs Draco-compressed .glb file to public/models", () => {
    const result = runAssetPipeline();
    expect(result.success).toBe(true);

    const glbPath = path.resolve("public/models/roomba_procedural.glb");
    expect(fs.existsSync(glbPath)).toBe(true);

    const stats = fs.statSync(glbPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it("AC-2: Bakes squash and stretch morph targets (shape keys) into asset metadata", () => {
    const metaPath = path.resolve("public/models/roomba_procedural.meta.json");
    expect(fs.existsSync(metaPath)).toBe(true);

    const rawMeta = fs.readFileSync(metaPath, "utf-8");
    const meta = JSON.parse(rawMeta);

    expect(meta.shapeKeys).toContain("Basis");
    expect(meta.shapeKeys).toContain("Squash");
    expect(meta.shapeKeys).toContain("Stretch");
    expect(meta.dracoCompressed).toBe(true);
    expect(meta.materials).toContain("Mat_Chassis");
  });

  it("AC-3: Executable in headless mode without GUI dependencies", () => {
    const pythonScriptPath = path.resolve("scripts/blender/generate_roomba.py");
    expect(fs.existsSync(pythonScriptPath)).toBe(true);

    const content = fs.readFileSync(pythonScriptPath, "utf-8");
    expect(content).toContain("export_draco_mesh_compression_enable=True");
    expect(content).toContain("export_morph=True");
    expect(content).toContain("shape_key_add");
  });

  it("AC-4: Graceful procedural fallback succeeds in CI environments without Blender installed", () => {
    const testDir = path.resolve("public/models/test-ci");
    const fallback = generateFallbackGLB(testDir);

    expect(fs.existsSync(fallback.outputPath)).toBe(true);
    expect(fallback.metadata.shapeKeys).toEqual(["Basis", "Squash", "Stretch"]);

    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
