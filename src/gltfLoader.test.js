import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { assetManager } from "./utils/gltfLoader";
import { useGLTFModel } from "./hooks/useGLTFModel";

describe("Story Verification: GLTF asset loader with Draco decompression (story-8285b0af)", () => {
  beforeEach(() => {
    assetManager.clearCache();
    vi.restoreAllMocks();
  });

  it("AC-1: Unpacks Draco compressed Blender .glb model in under 300ms", async () => {
    const mockBuffer = new ArrayBuffer(2048);
    const startTime = performance.now();

    const model = await assetManager.load("/models/roomba.glb", { mockBuffer });
    const duration = performance.now() - startTime;

    expect(model).toBeDefined();
    expect(model.metadata.dracoCompressed).toBe(true);
    expect(model.metadata.generator).toContain("Blender");
    expect(model.unpackTimeMs).toBeLessThan(300);
    expect(duration).toBeLessThan(300);
  });

  it("AC-2: Renders a low-poly proxy placeholder during async network latency without blocking", async () => {
    let resolveNetwork;
    const delayedFetchPromise = new Promise((resolve) => {
      resolveNetwork = resolve;
    });

    global.fetch = vi.fn().mockReturnValue(
      delayedFetchPromise.then(() => ({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }))
    );

    const { result } = renderHook(() => useGLTFModel("/models/delayed-obstacle.glb"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFallbackProxy).toBe(true);
    expect(result.current.model.geometry.type).toBe("CylinderGeometry");

    await act(async () => {
      resolveNetwork();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFallbackProxy).toBe(false);
    expect(result.current.model.metadata.dracoCompressed).toBe(true);
  });

  it("AC-3: Instances and shares geometries and materials in memory for duplicate models", async () => {
    const mockBuffer = new ArrayBuffer(512);

    const baseModel = await assetManager.load("/models/dust-bunny.glb", { mockBuffer });
    expect(baseModel).toBeDefined();

    const inst1 = assetManager.instance("/models/dust-bunny.glb");
    const inst2 = assetManager.instance("/models/dust-bunny.glb");
    const inst3 = assetManager.instance("/models/dust-bunny.glb");

    expect(inst1.instanceId).not.toEqual(inst2.instanceId);
    expect(inst2.instanceId).not.toEqual(inst3.instanceId);

    expect(inst1.sharedGeometries).toBe(baseModel.geometries);
    expect(inst2.sharedGeometries).toBe(baseModel.geometries);
    expect(inst1.sharedMaterials).toBe(baseModel.materials);
    expect(inst3.sharedMaterials).toBe(baseModel.materials);

    const stats = assetManager.getStats();
    expect(stats.instancesCreated).toBe(3);
    expect(stats.cachedCount).toBe(1);
  });

  it("AC-4: Configures Draco WASM decoder from local static assets without CDN failures", () => {
    const config = assetManager.getDracoConfig();

    expect(config.decoderPath).toBe("/draco/");
    expect(config.wasmBinaryPath).toBe("/draco/draco_decoder.wasm");
    expect(config.isConfigured).toBe(true);

    const customConfig = assetManager.configureDraco({
      decoderPath: "/assets/draco/",
      wasmBinaryPath: "/assets/draco/draco_decoder.wasm",
    });

    expect(customConfig.decoderPath).toBe("/assets/draco/");
    expect(customConfig.wasmBinaryPath).toBe("/assets/draco/draco_decoder.wasm");
  });
});
