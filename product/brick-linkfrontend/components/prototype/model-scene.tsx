"use client";

import { Component, type ReactNode, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import * as THREE from "three";
import { normalizeEmbeddedPaths } from "@/lib/ldraw";
import type { Blueprint } from "@/lib/demo/types";

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function dispose(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material)
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
        (m) => materials.add(m),
      );
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

/** Loads the actual MPD geometry. Inventory matching remains in lib/demo. */
export default function ModelScene({
  model,
}: {
  model: Blueprint;
  step?: number;
}) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let loaded: THREE.Group | undefined;
    setGroup(null);
    setError(false);
    async function load() {
      try {
        const loader = new LDrawLoader();
        loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
        loader.setPartsLibraryPath("/ldraw/");
        await loader.preloadMaterials("/ldraw/LDConfig.ldr");
        const source = (await new THREE.FileLoader().loadAsync(
          model.modelUrl!,
        )) as string;
        loaded = await new Promise<THREE.Group>((resolve, reject) => {
          loader.parse(normalizeEmbeddedPaths(source), resolve, reject);
        });
        if (!active) {
          dispose(loaded);
          return;
        }
        loaded.rotation.x = Math.PI;
        loaded.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        loaded.position.sub(bounds.getCenter(new THREE.Vector3()));
        const framed = new THREE.Group();
        framed.add(loaded);
        framed.scale.setScalar(5 / Math.max(size.x, size.y, size.z, 1));
        setGroup(framed);
      } catch (error) {
        console.warn("OMR model could not load", error);
        if (active) setError(true);
      }
    }
    void load();
    return () => {
      active = false;
      if (loaded) dispose(loaded);
    };
  }, [model.modelUrl]);
  const fallback = (
    <div className="scene-fallback">
      <img src={model.image} alt={model.name} />
      <p>The picture view is ready. 3D needs the LDraw parts library.</p>
    </div>
  );
  if (error) return fallback;
  return (
    <SceneBoundary fallback={fallback}>
      <div
        className="omr-scene"
        aria-label={`Interactive 3D view of ${model.name}`}
      >
        <Canvas
          camera={{ position: [6, 4, 7], fov: 35 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={1.6} />
          <directionalLight position={[6, 10, 8]} intensity={2.4} />
          <directionalLight position={[-5, 3, -4]} intensity={1.1} />
          {group && <primitive object={group} />}
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={3}
            maxDistance={20}
          />
        </Canvas>
        {!group && (
          <p className="omr-scene-status" role="status">
            Opening your model…
          </p>
        )}
      </div>
    </SceneBoundary>
  );
}
