import { useState, useRef, useEffect, useCallback } from "react";

export function useJuice() {
  const [trauma, setTrauma] = useState(0);
  const [cameraShake, setCameraShake] = useState({ x: 0, y: 0, rot: 0, fovOffset: 0 });

  const [deformation, setDeformation] = useState({
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    isSquashing: false,
  });

  const [isHitstopActive, setIsHitstopActive] = useState(false);
  const hitstopTimeoutRef = useRef(null);

  const traumaRef = useRef(0);
  const deformationRef = useRef({ scaleX: 1, scaleY: 1, rotationDeg: 0 });
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  const addTrauma = useCallback((amount) => {
    traumaRef.current = Math.min(1.0, Math.max(0, traumaRef.current + amount));
    setTrauma(traumaRef.current);
  }, []);

  const triggerHitstop = useCallback((durationMs = 60, onComplete) => {
    if (hitstopTimeoutRef.current) {
      clearTimeout(hitstopTimeoutRef.current);
    }
    setIsHitstopActive(true);

    hitstopTimeoutRef.current = setTimeout(() => {
      setIsHitstopActive(false);
      hitstopTimeoutRef.current = null;
      if (onComplete) onComplete();
    }, durationMs);
  }, []);

  const triggerSquashStretch = useCallback((actionType = "jump") => {
    if (actionType === "jump") {
      deformationRef.current = { scaleX: 0.92, scaleY: 1.15, rotationDeg: 0 };
    } else if (actionType === "land" || actionType === "impact") {
      deformationRef.current = { scaleX: 1.25, scaleY: 0.8, rotationDeg: 0 };
    } else if (actionType === "turnLeft") {
      deformationRef.current = { scaleX: 0.9, scaleY: 1.1, rotationDeg: -10 };
    } else if (actionType === "turnRight") {
      deformationRef.current = { scaleX: 0.9, scaleY: 1.1, rotationDeg: 10 };
    } else if (actionType === "move") {
      deformationRef.current = { scaleX: 1.12, scaleY: 0.9, rotationDeg: 0 };
    }

    setDeformation({
      ...deformationRef.current,
      isSquashing: true,
    });
  }, []);

  const triggerCollisionImpact = useCallback((severity = "heavy") => {
    const isHeavy = severity === "heavy";
    const duration = isHeavy ? 60 : 30;
    const traumaAmount = isHeavy ? 0.85 : 0.45;

    triggerHitstop(duration);
    addTrauma(traumaAmount);
    triggerSquashStretch("impact");
  }, [triggerHitstop, addTrauma, triggerSquashStretch]);

  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const currentTime = Date.now();
      const rawDt = (currentTime - lastTimeRef.current) / 1000;
      const dt = rawDt > 0 && rawDt < 0.2 ? rawDt : 0.016;
      lastTimeRef.current = currentTime;

      if (traumaRef.current > 0) {
        traumaRef.current = Math.max(0, traumaRef.current - 1.5 * dt);
        setTrauma(traumaRef.current);

        const intensity = traumaRef.current * traumaRef.current;
        const timeVal = currentTime * 0.025;

        const shakeX = intensity * (Math.sin(timeVal * 1.7) * 12 + Math.cos(timeVal * 2.3) * 6);
        const shakeY = intensity * (Math.cos(timeVal * 1.9) * 10 + Math.sin(timeVal * 3.1) * 5);
        const shakeRot = intensity * Math.sin(timeVal * 2.1) * 3.5;
        const fovOffset = intensity * 12;

        setCameraShake({
          x: Math.round(shakeX * 100) / 100,
          y: Math.round(shakeY * 100) / 100,
          rot: Math.round(shakeRot * 100) / 100,
          fovOffset: Math.round(fovOffset * 10) / 10,
        });
      } else {
        setCameraShake((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0, rot: 0, fovOffset: 0 }));
      }

      const def = deformationRef.current;
      const targetScaleX = 1;
      const targetScaleY = 1;
      const targetRot = 0;

      const lambda = 14;
      const decay = Math.exp(-lambda * dt);

      def.scaleX = targetScaleX + (def.scaleX - targetScaleX) * decay;
      def.scaleY = targetScaleY + (def.scaleY - targetScaleY) * decay;
      def.rotationDeg = targetRot + (def.rotationDeg - targetRot) * decay;

      if (
        Math.abs(targetScaleX - def.scaleX) < 0.005 &&
        Math.abs(targetScaleY - def.scaleY) < 0.005 &&
        Math.abs(targetRot - def.rotationDeg) < 0.1
      ) {
        def.scaleX = 1;
        def.scaleY = 1;
        def.rotationDeg = 0;
        setDeformation({
          scaleX: 1,
          scaleY: 1,
          rotationDeg: 0,
          isSquashing: false,
        });
      } else {
        setDeformation({
          scaleX: def.scaleX,
          scaleY: def.scaleY,
          rotationDeg: def.rotationDeg,
          isSquashing: true,
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (hitstopTimeoutRef.current) clearTimeout(hitstopTimeoutRef.current);
    };
  }, []);

  return {
    trauma,
    cameraShake,
    deformation,
    isHitstopActive,
    addTrauma,
    triggerHitstop,
    triggerSquashStretch,
    triggerCollisionImpact,
  };
}
