"use client"

import type React from "react"

import { useState } from "react"
import { ArrowRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import LDrawViewer from "./ldraw-viewer"
import BrickStackingLoader from "./brick-stacking-loader"
import PDFDownloadButton from "./pdf-download-button"
import BouncingLogo from "./bouncing-logo"

// Clean filename function to match backend logic
function cleanFilename(filename: string): string {
  // Remove or replace problematic characters
  let clean = filename
  
  // Remove special characters that cause issues
  clean = clean.replace(/[{}()\[\]<>:"/\\|?*]/g, '')
  
  // Replace spaces and common separators with single underscores
  clean = clean.replace(/[\s,;]+/g, '_')
  
  // Remove apostrophes and quotes
  clean = clean.replace(/['"]/g, '')
  
  // Remove exclamation marks and other punctuation
  clean = clean.replace(/[!?.]/g, '')
  
  // Remove multiple consecutive underscores
  clean = clean.replace(/_+/g, '_')
  
  // Remove leading/trailing underscores
  clean = clean.replace(/^_+|_+$/g, '')
  
  // Ensure it's not empty and not too long
  if (!clean) {
    clean = "model"
  } else if (clean.length > 50) {
    clean = clean.substring(0, 50).replace(/_+$/, '')
  }
  
  return clean
}

export default function LegoBuilder() {
  const [prompt, setPrompt] = useState("")
  const [isBuilding, setIsBuilding] = useState(false)
  const [userRequest, setUserRequest] = useState("")
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelData, setModelData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    try {
      // Call backend cleanup endpoint
      await fetch('http://localhost:8000/api/v1/cleanup-outputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (err) {
      console.warn('Cleanup request failed:', err)
      // Continue with refresh even if cleanup fails
    }
    
    // Reset frontend state
    setPrompt("")
    setIsBuilding(false)
    setUserRequest("")
    setModelUrl(null)
    setModelData(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      console.log("[v0] Building LEGO model for prompt:", prompt)
      setUserRequest(prompt)
      setIsBuilding(true)
      setError(null)
      setModelData(null)
      
      try {
        // Call the backend API to generate model and instructions
        const response = await fetch('http://localhost:8000/api/v1/retrieve-model-with-instructions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            max_results: 5
          }),
        })

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] API response:", data)

        if (data.success) {
          setModelData(data)
          // The backend automatically copies the model to the frontend's public directory
          // Use the same filename format as the backend: set_number + clean_name
          if (data.selected_result) {
            const setNumber = data.selected_result.set_number
            const cleanName = cleanFilename(data.selected_result.name)
            const filename = `${setNumber}_${cleanName}.mpd`
            setModelUrl(`/ldraw/models/${filename}`)
          } else {
            // Fallback to placeholder if no model info
            setModelUrl("/ldraw/models/red_race_car.mpd")
          }
        } else {
          throw new Error(data.error_details || "Failed to generate model")
        }
      } catch (err) {
        console.error("[v0] Error generating model:", err)
        
        // Check if it's a network error (backend not running)
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError("Backend server not running. Please start the backend with: python -m src.main")
        } else {
          setError(err instanceof Error ? err.message : "Failed to generate model")
        }
        
        // For demo purposes, still show the model with placeholder data
        console.log("[v0] Using demo mode with placeholder data")
        setModelData({
          selected_result: {
            set_number: "DEMO-001",
            name: prompt,
            theme: "Demo"
          },
          pdf_instructions: "demo-pdf-path"
        })
        setModelUrl("/ldraw/models/red_race_car.mpd")
      }
    }
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Grid Background */}
      <div
        className={`absolute inset-0 grid-background transition-transform duration-1000 ease-out ${
          isBuilding ? "scale-[2.5]" : "scale-100"
        }`}
      />

      {/* Logo */}
      <div className="absolute left-8 top-8 z-10">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">brick-kit</h1>
      </div>

      {!isBuilding && (
        <div className="relative -mt-16 flex h-full w-full flex-col items-center justify-center gap-4">
          {/* Aesthetic Text */}
          <h2 className="text-balance text-center font-sans text-5xl font-light tracking-wide text-foreground/90 transition-opacity duration-500">
            let your imagination run wild
          </h2>

          {/* LEGO Minifigure */}
          <div className="relative -mt-4 transition-opacity duration-500">
            <Image
              src="/images/lego-minifig.png"
              alt="LEGO Spaceman"
              width={400}
              height={400}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      )}

      {isBuilding && (
        <div className="relative flex h-full w-full items-center justify-center">
          {error ? (
            <div className="text-center">
              <p className="text-red-400 mb-2">Error generating model</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          ) : modelUrl ? (
            <div className="relative h-full w-full">
              <LDrawViewer modelUrl={modelUrl} />
              {/* PDF Download Button and Refresh Button */}
              {modelData && (
                <div className="absolute top-8 right-8 z-30 flex flex-col gap-4">
                  <PDFDownloadButton 
                    modelId={modelData.selected_result?.set_number || "model"}
                    modelName={modelData.selected_result?.name || userRequest}
                    userPrompt={userRequest}
                  />
                  <Button
                    onClick={handleRefresh}
                    size="lg"
                    className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
                    title="Start New Build"
                  >
                    <RotateCcw className="h-6 w-6 text-background" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <BrickStackingLoader />
          )}
        </div>
      )}

      {/* Prompt Input Panel */}
      <div
        className={`absolute z-20 transition-all duration-700 ease-out ${
          isBuilding
            ? "bottom-6 right-6 w-auto max-w-2xl translate-x-0"
            : "bottom-12 left-1/2 w-full max-w-2xl -translate-x-1/2"
        } px-6`}
      >
        {isBuilding && (
          <div className="mb-6 rounded-3xl border border-border/20 bg-card/80 px-10 py-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              {!modelUrl && (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-card-foreground/20 border-t-card-foreground/70" />
              )}
              <p className="font-sans text-lg font-light text-card-foreground/70">
                {modelUrl ? "courtesy of kit:" : "kit is cooking your:"}
              </p>
              <p className="font-sans text-xl font-normal text-card-foreground">{userRequest}</p>
            </div>
          </div>
        )}

        {!isBuilding && (
          <form onSubmit={handleSubmit}>
            <div className="group relative rounded-[2rem] border border-border/20 bg-card/80 p-1.5 shadow-2xl backdrop-blur-xl transition-all hover:bg-card/90">
              <div className="flex items-center gap-2 px-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Build anything"
                  className="flex-1 bg-transparent py-3.5 font-sans text-base font-light text-card-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-card-foreground text-card transition-all hover:scale-105 hover:bg-card-foreground/90"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Subtle vignette effect */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/40" />
      
      {/* Bouncing Logo */}
      <BouncingLogo isPromptActive={isBuilding || prompt.length > 0} />
    </div>
  )
}
