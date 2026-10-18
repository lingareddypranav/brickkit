"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowRight,
  CheckCheck,
  ExternalLink,
  LockKeyhole,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { availablePieces, matchInventory } from "@/lib/demo/inventory";
import type { Blueprint } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";
import { LegacyBuildGuide } from "./legacy-build-guide";

const ModelScene = dynamic(() => import("./model-scene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Opening your model…</div>,
});

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
  const [keepBuilt, setKeepBuilt] = useState(true);
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
      title={saved ? "Look what you made!" : `Let’s build ${model.name}`}
      description={
        saved
          ? "A new adventure for your shelf."
          : "Grab your bricks and build together."
      }
      wide
    >
      {saved ? (
        <div className="build-celebration">
          <img src={model.image} alt={model.name} />
          <h3>You made {model.name}!</h3>
          <p>
            {keepBuilt
              ? "Its pieces are saved for this creation until you’re ready to remix."
              : "Your pieces are ready for another adventure."}
          </p>
          <button className="kit-button kit-button-dark" onClick={onShelf}>
            Visit my creations <ArrowRight size={18} />
          </button>
          <button className="kit-text-button" onClick={onClose}>
            Dream up something else
          </button>
        </div>
      ) : (
        <>
          <div className="guide-title">
            <div>
              <span className="kit-eyebrow">
                SET {model.source!.setId.split("-")[0]}
              </span>
              <h3>Your building buddy</h3>
            </div>
            <button className="kit-text-button" onClick={() => setIn3D(!in3D)}>
              {in3D ? "Picture view" : "Spin in 3D"}
            </button>
          </div>
          <div className="guide-stage" style={{ background: model.background }}>
            {in3D ? (
              <ModelScene model={model} />
            ) : (
              <img src={model.image} alt={model.name} />
            )}
          </div>
          <p className="omr-guide-intro">
            Open the building instructions with your building buddy. You can
            keep this model beside you and turn it around in 3D while you build.
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
            Choose this model’s version in the instructions. Some older sets may
            not have a booklet online.
          </p>
          <label className="finish-lock">
            <input
              type="checkbox"
              checked={keepBuilt}
              onChange={(e) => setKeepBuilt(e.target.checked)}
            />
            <LockKeyhole size={20} />
            <span>
              <strong>Keep my {model.name.toLowerCase()} built</strong>
              <small>
                Save these bricks for this creation until I’m ready to remix.
              </small>
            </span>
          </label>
          {!ready && (
            <p className="collection-changed" role="status">
              Your brick box changed. Make these pieces available again before
              saving your creation.
            </p>
          )}
          <div className="guide-actions">
            <button className="kit-button kit-button-outline" onClick={onClose}>
              Build later
            </button>
            <button
              className="kit-button kit-button-dark"
              disabled={!ready}
              onClick={() => {
                if (!ready || saved) return;
                box.saveCreation(model.id, keepBuilt);
                setSaved(true);
              }}
            >
              I made it! <CheckCheck size={19} />
            </button>
          </div>
        </>
      )}
    </KitDialog>
  );
}
