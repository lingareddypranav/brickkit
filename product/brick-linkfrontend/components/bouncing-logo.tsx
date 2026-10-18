"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BouncingLogoProps {
  isPromptActive: boolean
}

export default function BouncingLogo({ isPromptActive }: BouncingLogoProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isPromptActive) {
      setIsAnimating(false)
      return
    }

    // Start the Pixar lamp-style animation
    const startAnimation = () => {
      setIsAnimating(true)
      
      // Stop animation after the CSS animation completes
      setTimeout(() => {
        setIsAnimating(false)
      }, 1200) // Match the CSS animation duration
    }

    // Start animation immediately, then repeat every 3-5 seconds
    startAnimation()
    const interval = setInterval(startAnimation, Math.random() * 2000 + 3000)

    return () => clearInterval(interval)
  }, [isPromptActive])

  return (
    <>
      <style jsx>{`
        @keyframes pixarBounce {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          10% {
            transform: translateX(-3px) translateY(-8px) rotate(-1deg);
          }
          20% {
            transform: translateX(2px) translateY(-12px) rotate(1deg);
          }
          30% {
            transform: translateX(-1px) translateY(-8px) rotate(-0.5deg);
          }
          40% {
            transform: translateX(1px) translateY(-4px) rotate(0.5deg);
          }
          50% {
            transform: translateX(-0.5px) translateY(-2px) rotate(-0.2deg);
          }
          60% {
            transform: translateX(0.5px) translateY(-1px) rotate(0.2deg);
          }
          70% {
            transform: translateX(-0.2px) translateY(-0.5px) rotate(-0.1deg);
          }
          80% {
            transform: translateX(0.2px) translateY(-0.2px) rotate(0.1deg);
          }
          90% {
            transform: translateX(-0.1px) translateY(-0.1px) rotate(-0.05deg);
          }
          100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
        }
        
        .pixar-bounce {
          animation: pixarBounce 1.2s ease-out;
        }
      `}</style>
      
      <div
        className={`fixed bottom-3 left-8 z-50 ${
          isAnimating ? 'pixar-bounce' : ''
        }`}
      >
        <Image
          src="/kitlogo.png"
          alt="Kit Logo"
          width={150}
          height={150}
          className="opacity-80 hover:opacity-100 transition-opacity duration-200"
        />
      </div>
    </>
  )
}
