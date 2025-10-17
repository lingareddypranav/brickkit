"use client"

import Image from "next/image"

export default function BrickStackingLoader() {
  const letterK = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
    { x: 0, y: 4 }, // Left vertical line
    { x: 1, y: 3 },
    { x: 2, y: 4 }, // Upper diagonal
    { x: 1, y: 2 }, // Middle connection
    { x: 2, y: 1 },
    { x: 2, y: 0 }, // Lower diagonal
  ]

  const letterI = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 }, // Vertical line - slightly lower than original
    { x: 0, y: 5 }, // Dot on top - slightly lower than original
  ]

  const letterT = [
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 2, y: 4 }, // Top horizontal
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 }, // Vertical stem
  ]

  const letters = [
    { name: "K", bricks: letterK, color: "hue-rotate-[320deg]", startTime: 0, offsetX: 30 }, // Red - moved left
    { name: "i", bricks: letterI, color: "hue-rotate-[180deg]", startTime: 4, offsetX: 92 }, // Blue - moved left slightly
    { name: "t", bricks: letterT, color: "hue-rotate-[40deg]", startTime: 7.5, offsetX: 25 }, // Yellow - moved left more for better centering
  ]

  const totalDuration = 12 // Total animation cycle in seconds

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-[448px] w-[358px]">
        {letters.map((letter, letterIdx) =>
          letter.bricks.map((brick, brickIdx) => (
            <div
              key={`${letterIdx}-${brickIdx}`}
              className="absolute w-28 opacity-0"
              style={{
                left: `${brick.x * 84 + letter.offsetX * 1.4}px`,
                bottom: `${brick.y * 63 + 28}px`,
                animation: `buildBrick-${letterIdx} ${totalDuration}s ease-in-out infinite`,
                animationDelay: `${brickIdx * 0.2}s`,
              }}
            >
              <Image
                src="/images/brickloading.png"
                alt="LEGO Brick"
                width={112}
                height={49}
                style={{ width: "auto", height: "auto" }}
                className={`object-contain ${letter.color} drop-shadow-lg`}
              />
            </div>
          )),
        )}
      </div>

      <p className="mt-4 font-sans text-5xl font-light text-foreground/70">generating bricks</p>

      <style jsx>{`
        @keyframes buildBrick-0 {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          5% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          28% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          33% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
        }

        @keyframes buildBrick-1 {
          0%,
          33% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          38% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          58% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          62% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
        }

        @keyframes buildBrick-2 {
          0%,
          62% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          67% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          87% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          92% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
        }
      `}</style>
    </div>
  )
}
