"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js"

interface LDrawModelProps {
  modelUrl: string
  onError: (error: string) => void
}

function LDrawModel({ modelUrl, onError }: LDrawModelProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group>()

  useEffect(() => {
    console.log("[v0] Loading LDraw model from:", modelUrl)

    const loadModel = async () => {
      try {
        const loader = new LDrawLoader()

        // Parts library root that contains /parts, /p, and LDConfig.ldr:
        loader.setPartsLibraryPath("/ldraw/")   // note the trailing slash
        loader.preloadMaterials("/ldraw/LDConfig.ldr")           // loads /ldraw/LDConfig.ldr

        loader.setConditionalLineMaterial(THREE.LineBasicMaterial)

        // Load your model from anywhere (absolute or relative); subfiles come from /ldraw/
        const fullModelUrl = modelUrl.startsWith('http') ? modelUrl : `${window.location.origin}${modelUrl}`
        
        console.log("[v0] Loading model:", modelUrl)
        console.log("[v0] Full model URL:", fullModelUrl)
        
        loader.load(
          fullModelUrl,
              (group) => {
                console.log("[v0] LDraw model loaded successfully")
                console.log("[v0] Group children count:", group.children.length)
                console.log("[v0] Group position:", group.position)
                console.log("[v0] Group scale:", group.scale)

                if (groupRef.current) {
                  scene.remove(groupRef.current)
                }

                const box = new THREE.Box3().setFromObject(group)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())

                console.log("[v0] Model bounding box:", { center, size })
                console.log("[v0] Model size details:", { x: size.x, y: size.y, z: size.z })

                // Don't center the model - keep it at origin so camera can see it
                // group.position.sub(center)

                const maxDim = Math.max(size.x, size.y, size.z)
                if (maxDim > 0) {
                  const scale = 12 / maxDim  // Reduced to 12 for slightly smaller size
                  group.scale.multiplyScalar(scale)
                  console.log("[v0] Applied scale:", scale)
                }

                // Fix upside-down orientation by rotating 180 degrees around X axis
                group.rotation.x = Math.PI

                groupRef.current = group
                scene.add(group)
                console.log("[v0] Model added to scene")
                console.log("[v0] Final model position:", group.position)
                console.log("[v0] Final model scale:", group.scale)
              },
          (progress) => {
            console.log("[v0] Loading progress:", progress)
          },
          (error) => {
            console.error("[v0] Error loading LDraw model:", error)
            onError(error.message || "Failed to load model")
          },
        )
      } catch (error) {
        console.error("[v0] Error fetching model:", error)
        onError(error instanceof Error ? error.message : "Failed to fetch model")
      }
    }

    loadModel()

    return () => {
      if (groupRef.current) {
        scene.remove(groupRef.current)
      }
    }
  }, [modelUrl, scene, onError])

  return null
}

interface LDrawViewerProps {
  modelUrl: string
}

export default function LDrawViewer({ modelUrl }: LDrawViewerProps) {
  const [error, setError] = useState<string | null>(null)

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading model</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [10, 10, 10], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />

        <LDrawModel modelUrl={modelUrl} onError={setError} />

        <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.5} minDistance={5} maxDistance={50} />
      </Canvas>
    </div>
  )
}