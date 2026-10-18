"use client";

import { Component, type ReactNode, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { partByKey } from "@/lib/demo/catalog";
import type { Blueprint, Placement } from "@/lib/demo/types";

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

function Brick({ piece }: { piece: Placement }) {
  const part = partByKey[piece.key];
  const height = part.height * 0.4;
  const wheel = part.shape === "wheel";
  const tyre = part.shape === "tyre";
  if (wheel || tyre)
    return (
      <group position={[piece.x, 0.55, piece.z]} rotation={[0, Math.PI / 2, 0]}>
        {tyre ? (
          <mesh castShadow>
            <torusGeometry args={[0.48, 0.16, 10, 24]} />
            <meshStandardMaterial color="#292E34" roughness={0.85} />
          </mesh>
        ) : (
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 20]} />
            <meshStandardMaterial color={part.hex} roughness={0.4} />
          </mesh>
        )}
      </group>
    );
  return (
    <group
      position={[piece.x, piece.y * 0.4, piece.z]}
      rotation={[0, ((piece.rotate ?? 0) * Math.PI) / 180, 0]}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[part.width * 0.98, height * 0.98, part.depth * 0.98]}
        />
        <meshStandardMaterial color={part.hex} roughness={0.38} />
      </mesh>
      {Array.from({ length: part.width }, (_, x) =>
        Array.from({ length: part.depth }, (_, z) => (
          <mesh
            key={`${x}:${z}`}
            position={[
              x - (part.width - 1) / 2,
              height + 0.065,
              z - (part.depth - 1) / 2,
            ]}
            castShadow
          >
            <cylinderGeometry args={[0.28, 0.28, 0.13, 16]} />
            <meshStandardMaterial color={part.hex} roughness={0.38} />
          </mesh>
        )),
      )}
    </group>
  );
}

export default function ModelScene({
  model,
  step,
}: {
  model: Blueprint;
  step: number;
}) {
  const framing = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity,
      maxY = 0;
    for (const piece of model.placements) {
      const part = partByKey[piece.key];
      const width = piece.rotate === 90 ? part.depth : part.width,
        depth = piece.rotate === 90 ? part.width : part.depth;
      minX = Math.min(minX, piece.x - width / 2);
      maxX = Math.max(maxX, piece.x + width / 2);
      minZ = Math.min(minZ, piece.z - depth / 2);
      maxZ = Math.max(maxZ, piece.z + depth / 2);
      maxY = Math.max(maxY, (piece.y + part.height) * 0.4);
    }
    return {
      center: new THREE.Vector3((minX + maxX) / 2, maxY / 2, (minZ + maxZ) / 2),
      scale: 5 / Math.max(maxX - minX, maxZ - minZ, maxY),
    };
  }, [model]);
  return (
    <SceneBoundary
      fallback={
        <div className="scene-fallback">
          <img
            src={`/demo/steps/${model.id}-${step + 1}.svg`}
            alt={`${model.name}, step ${step + 1}`}
          />
          <p>The picture view is ready on this device.</p>
        </div>
      }
    >
      <Canvas
        shadows
        camera={{ position: [7, 6, 9], fov: 35 }}
        gl={{ antialias: true }}
        aria-label={`Interactive 3D view of ${model.name}`}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 6]} intensity={2.2} castShadow />
        <directionalLight position={[-5, 3, -4]} intensity={1} />
        <Bounds fit clip observe margin={1.35}>
          <group scale={framing.scale}>
            <group
              position={[
                -framing.center.x,
                -framing.center.y,
                -framing.center.z,
              ]}
            >
              {model.placements
                .filter((piece) => piece.step <= step + 1)
                .map((piece, i) => (
                  <Brick piece={piece} key={i} />
                ))}
            </group>
          </group>
        </Bounds>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2}
          maxDistance={19}
        />
      </Canvas>
    </SceneBoundary>
  );
}
