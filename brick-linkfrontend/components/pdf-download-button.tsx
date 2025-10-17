"use client"

import React, { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PDFDownloadButtonProps {
  modelId?: string
  modelName?: string
  userPrompt?: string
  className?: string
}

export default function PDFDownloadButton({ 
  modelId, 
  modelName, 
  userPrompt,
  className = "" 
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!modelId) {
      setError("No model ID available for download")
      return
    }

    setIsDownloading(true)
    setError(null)

    try {
      // Call the backend API to get the PDF
      const response = await fetch(`http://localhost:8000/api/v1/download-pdf/${modelId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`)
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename using user's prompt
      const promptForFilename = userPrompt || modelName || 'lego_model'
      const safeName = promptForFilename
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters but keep spaces
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase()
      link.download = `${safeName}_instructions.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Error downloading PDF:', err)
      
      // Check if it's a network error (backend not running)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Backend not running - PDF not available")
      } else if (err instanceof Error && err.message.includes('404')) {
        setError("No PDF available - model has no build steps")
      } else {
        setError(err instanceof Error ? err.message : 'Failed to download PDF')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Button
        onClick={handleDownload}
        disabled={isDownloading || !modelId}
        size="lg"
        className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
        title={modelId ? "Download PDF Instructions" : "PDF not available"}
      >
        {isDownloading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-background border-t-transparent" />
        ) : (
          <Download className="h-6 w-6 text-background" />
        )}
      </Button>
      
      {error && (
        <p className="text-xs text-red-400 text-center max-w-32">
          {error}
        </p>
      )}
      
    </div>
  )
}
