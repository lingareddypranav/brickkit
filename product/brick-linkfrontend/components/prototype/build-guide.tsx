"use client";

import dynamic from "next/dynamic";
import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { availablePieces, matchInventory } from "@/lib/demo/inventory";
import type { Blueprint } from "@/lib/demo/types";
import { instructionsFor } from "@/lib/demo/instructions";
import { BookletInstructions } from "./booklet-instructions";
import { PictureInstructions } from "./picture-instructions";
import "./guide.css";
import { KitDialog } from "./kit-dialog";
import { LegacyBuildGuide } from "./legacy-build-guide";

const ModelScene = dynamic(() => import("./model-scene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Opening your model…</div>,
});

const CONFETTI: (CSSProperties & Record<"--dx" | "--delay" | "--piece", string>)[] = [
  { left: "8%", "--dx": "-36px", "--delay": "0s", "--piece": "var(--bp-blue-1)" },
  { left: "18%", "--dx": "16px", "--delay": "0.05s", "--piece": "var(--bp-orange-1)", width: 10, height: 10, borderRadius: 99 },
  { left: "28%", "--dx": "-18px", "--delay": "0.1s", "--piece": "var(--bp-dark-1)" },
  { left: "38%", "--dx": "24px", "--delay": "0s", "--piece": "var(--bp-orange-1)" },
  { left: "48%", "--dx": "-10px", "--delay": "0.08s", "--piece": "var(--bp-blue-1)", width: 10, height: 10, borderRadius: 99 },
  { left: "58%", "--dx": "20px", "--delay": "0.04s", "--piece": "var(--bp-orange-1)" },
  { left: "68%", "--dx": "-22px", "--delay": "0.12s", "--piece": "var(--bp-blue-1)" },
  { left: "78%", "--dx": "28px", "--delay": "0s", "--piece": "var(--bp-dark-1)", width: 10, height: 10, borderRadius: 99 },
  { left: "88%", "--dx": "-14px", "--delay": "0.06s", "--piece": "var(--bp-orange-1)" },
];

type Props = {
  model: Blueprint;
  box: BrickBox;
  onClose: () => void;
  onShelf: () => void;
};

export function BuildGuide(props: Props) {
  return props.model.source ? (
    <OMRBuildGuide {...props} />
  ) : (
    <LegacyBuildGuide {...props} />
  );
}

function OMRBuildGuide({ model, box, onClose, onShelf }: Props) {
  const guide = instructionsFor(model.id);
  const [step, setStep] = useState(0);
  const lastStep =
    guide?.kind !== "pictures" || step === guide.steps.length - 1;
  const [saved, setSaved] = useState(false);
  const [in3D, setIn3D] = useState(false);
  const ready = matchInventory(
    model.inventory,
    availablePieces(box.collection),
  ).ready;
  return (
    <KitDialog
      open
      onClose={onClose}
      title={saved ? "Congrats!" : `Let’s build ${model.name}`}
      headingAction={
        !saved && guide?.kind === "pictures" && guide.pdfUrl ? (
          <a
            className="kit-icon-button"
            href={guide.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open PDF booklet"
          >
            <BookOpen size={20} />
          </a>
        ) : null
      }
      wide
    >
      {saved ? (
        <div className="build-celebration is-done">
          <div className="celebration-confetti" aria-hidden="true">
            {CONFETTI.map((piece) => (
              <span key={String(piece.left)} style={piece} />
            ))}
          </div>
          <img src={model.image} alt={model.name} />
          <h3>You made {model.name}!</h3>
          <button className="kit-button kit-button-dark" onClick={onShelf}>
            Visit my creations <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          {guide?.kind === "pictures" ? (
            <PictureInstructions
              guide={guide}
              name={model.name}
              background={model.background}
              step={step}
              onStep={setStep}
              canFinish={ready}
              onFinish={() => {
                if (!ready || saved) return;
                box.saveCreation(model.id, true);
                setSaved(true);
              }}
            />
          ) : guide?.kind === "booklet" ? (
            <BookletInstructions model={model} guide={guide} />
          ) : (
            <>
              <div className="guide-title">
                <div>
                  <span className="kit-eyebrow">
                    SET {model.source!.setId.split("-")[0]}
                  </span>
                  <h3>Your building buddy</h3>
                </div>
                <button
                  className="kit-text-button"
                  onClick={() => setIn3D(!in3D)}
                >
                  {in3D ? "Picture view" : "Spin in 3D"}
                </button>
              </div>
              <div
                className="guide-stage"
                style={{ background: model.background }}
              >
                {in3D ? (
                  <ModelScene model={model} />
                ) : (
                  <img src={model.image} alt={model.name} />
                )}
              </div>
              <p className="omr-guide-intro">
                Open the building instructions with your building buddy. You can
                keep this model beside you and turn it around in 3D while you
                build.
              </p>
              <div className="omr-instructions">
                <a
                  className="kit-button kit-button-outline"
                  href={model.source!.instructionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find LEGO instructions <ExternalLink size={16} />
                </a>
                <a
                  className="kit-text-button"
                  href={model.source!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  See the original model <ExternalLink size={14} />
                </a>
              </div>
              <p className="guide-tip">
                Choose this model’s version in the instructions. Some older sets
                may not have a booklet online.
              </p>
            </>
          )}
          {guide?.kind !== "pictures" && lastStep && (
            <div className="guide-actions">
              <button
                className="kit-button kit-button-outline"
                onClick={onClose}
              >
                Build later
              </button>
              <button
                className="kit-button kit-button-dark"
                disabled={!ready}
                onClick={() => {
                  if (!ready || saved) return;
                  box.saveCreation(model.id, true);
                  setSaved(true);
                }}
              >
                I made it
              </button>
            </div>
          )}
        </>
      )}
    </KitDialog>
  );
}
