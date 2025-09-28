import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEOData } from '../utils/orbitalMath';
import { AU_TO_UNITS } from '../utils/constants';

type Props = {
  neos: NEOData[];
  time: number; // simulation time in days relative to J2000 baseline
  onHover?: (neo: NEOData | undefined) => void;
  onClick?: (neo: NEOData) => void;
  updateHz?: number;
  pointSize?: number;
  selectedNeoId?: string | number;
  highlightColor?: string;
};

// Position computations are offloaded to a Web Worker now for performance

export default function AsteroidField({ neos, time, onHover, onClick, updateHz = 12, pointSize = 1.8, selectedNeoId, highlightColor = '#ffd700' }: Props) {
  const count = neos.length;
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const busyRef = useRef(false);

  // Elements stored in typed arrays for speed
  const { aArr, eArr, iArr, OmArr, omArr, M0Arr, PArr, colorArr, posArr } = useMemo(() => {
    const a = new Float32Array(count);
    const e = new Float32Array(count);
    const inc = new Float32Array(count);
    const Om = new Float32Array(count);
    const om = new Float32Array(count);
    const M0 = new Float32Array(count);
    const P = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);

    const cPHA = new THREE.Color('#ff2222');
    const cNEO = new THREE.Color('#f0f0f0');

    for (let i = 0; i < count; i++) {
      const neo = neos[i];
      a[i] = parseFloat(neo.a);
      e[i] = parseFloat(neo.e);
      inc[i] = (parseFloat(neo.i) * Math.PI) / 180;
      Om[i] = (parseFloat(neo.Omega) * Math.PI) / 180;
      om[i] = (parseFloat(neo.omega) * Math.PI) / 180;
      M0[i] = (parseFloat(neo.M) * Math.PI) / 180; // radians at baseline
      P[i] = Math.max(1e-3, parseFloat(neo.period)); // days

      const c = neo.type === 'PHA' ? cPHA : cNEO;
      const idx = i * 3;
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;

      // init positions (will be updated on first frame)
      positions[idx] = 0;
      positions[idx + 1] = 0;
      positions[idx + 2] = 0;
    }

    return { aArr: a, eArr: e, iArr: inc, OmArr: Om, omArr: om, M0Arr: M0, PArr: P, colorArr: colors, posArr: positions };
  }, [neos, count]);

  // Set geometry attributes once
  useEffect(() => {
    const geom = geomRef.current!;
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
    // Large bounding sphere to avoid culling as positions stream in
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), AU_TO_UNITS * 1000);
  }, [posArr, colorArr]);

  // Throttled position updates via Web Worker
  const lastUpdate = useRef(0);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const prevHighlightedIndex = useRef<number | null>(null);

  // Map id -> index for quick highlight lookup
  const idToIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < count; i++) {
      map.set(String(neos[i].id), i);
    }
    return map;
  }, [neos, count]);

  useEffect(() => {
    // When time jumps a lot, allow next frame to refresh immediately
    lastUpdate.current = 0;
  }, [time]);

  // Setup / reinit worker when elements change
  useEffect(() => {
    // Clean up previous worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    }
    if (count === 0) return;
    try {
      const worker = new Worker(new URL('../workers/asteroidWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (data?.type === 'ready') {
          workerReadyRef.current = true;
        } else if (data?.type === 'positions') {
          const geom = geomRef.current;
          if (!geom) return;
          const arr: Float32Array = new Float32Array(data.buffer);
          // Copy into our existing posArr buffer
          posArr.set(arr);
          const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
          posAttr.needsUpdate = true;
          busyRef.current = false;
        }
      };
      // Initialize with element arrays (copy once)
      worker.postMessage({
        type: 'init',
        a: aArr,
        e: eArr,
        inc: iArr,
        Om: OmArr,
        om: omArr,
        M0: M0Arr,
        P: PArr,
        count,
      });
    } catch (err) {
      console.error('Failed to start asteroid worker', err);
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [count, aArr, eArr, iArr, OmArr, omArr, M0Arr, PArr, posArr]);

  useFrame(() => {
    const now = performance.now();
    const minIntervalMs = 1000 / Math.max(1, updateHz);
    if (now - lastUpdate.current < minIntervalMs) return; // throttled updates
    lastUpdate.current = now;
    if (!workerRef.current || !workerReadyRef.current || busyRef.current) return;
    busyRef.current = true;
    workerRef.current.postMessage({ type: 'compute', time, scale: AU_TO_UNITS });
  });

  // Apply highlight color to selected asteroid and revert previous selection
  useEffect(() => {
    const geom = geomRef.current;
    if (!geom) return;
    const colorAttr = geom.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!colorAttr) return;

    // Revert previous highlight, if any
    if (prevHighlightedIndex.current !== null) {
      const idx = prevHighlightedIndex.current;
      if (idx >= 0 && idx < count) {
        const neo = neos[idx];
        const base = neo.type === 'PHA' ? new THREE.Color('#ff2222') : new THREE.Color('#f0f0f0');
        const cIdx = idx * 3;
        colorArr[cIdx] = base.r;
        colorArr[cIdx + 1] = base.g;
        colorArr[cIdx + 2] = base.b;
      }
    }

    // Apply new highlight
    let nextIndex: number | null = null;
    if (selectedNeoId !== undefined && selectedNeoId !== null) {
      const idx = idToIndex.get(String(selectedNeoId));
      if (idx !== undefined) {
        nextIndex = idx;
        const gold = new THREE.Color(highlightColor);
        const cIdx = idx * 3;
        colorArr[cIdx] = gold.r;
        colorArr[cIdx + 1] = gold.g;
        colorArr[cIdx + 2] = gold.b;
      }
    }
    prevHighlightedIndex.current = nextIndex;
    colorAttr.needsUpdate = true;
  }, [selectedNeoId, highlightColor, idToIndex, colorArr, neos, count]);

  const handlePointerMove = (e: any) => {
    if (typeof e.index === 'number') {
      const idx = e.index as number;
      onHover?.(neos[idx]);
    }
  };

  const handlePointerOut = () => onHover?.(undefined);
  const handleClick = (e: any) => {
    if (typeof e.index === 'number') onClick?.(neos[e.index as number]);
  };

  return (
    <points
      ref={pointsRef}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <bufferGeometry ref={geomRef} />
      <pointsMaterial
        ref={materialRef}
        size={pointSize}
        sizeAttenuation
        vertexColors
        depthWrite={false}
        transparent
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             // circular point sprite
             vec2 c = gl_PointCoord - vec2(0.5);
             float d = length(c);
             // smooth circular edge: alpha fades near radius
             float alpha = smoothstep(0.5, 0.45, d);
             if (d > 0.5) discard;
             gl_FragColor.a *= alpha;`
          );
        }}
      />
    </points>
  );
}
