"use client";

import dynamic from "next/dynamic";

import { useState } from "react";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Heart,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { partByKey } from "@/lib/demo/catalog";
import { availablePieces, matchInventory } from "@/lib/demo/inventory";
import type { Blueprint } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";
import "./build.css";

const ModelScene = dynamic(() => import("./model-scene"), { ssr: false });

export function BuildDetail({
  model,
  box,
  onClose,
  onManageBox,
  onFindPieces,
  onBuild,
}: {
  model: Blueprint;
  box: BrickBox;
  onClose: () => void;
  onManageBox: (tab: "sets" | "pieces") => void;
  onFindPieces: () => void;
  onBuild?: () => void;
}) {
  const [showAllPieces, setShowAllPieces] = useState(false);
  const [in3D, setIn3D] = useState(false);
  const available = availablePieces(box.collection);
  const match = matchInventory(model.inventory, available);
  const saved = box.collection.wishlist.includes(model.id);
  return (
    <KitDialog
      open
      onClose={onClose}
      title={model.name}
      description={model.description}
      wide
      minimal
    >
      <div className="build-detail-grid">
        <div
          className="detail-preview idea-art"
          style={{ background: model.background }}
        >
          {in3D ? (
            <ModelScene model={model} step={0} />
          ) : (
            <img src={model.image} alt={model.name} />
          )}
          <span
            className={`build-status ${match.ready ? "status-ready" : "status-dream"}`}
            aria-label={
              match.ready
                ? "Ready to build"
                : `Need ${match.missingCount} more pieces`
            }
          >
            {match.ready ? <Check size={18} /> : <Sparkles size={18} />}
          </span>
          <button
            className={`wish-button ${saved ? "is-wished" : ""}`}
            aria-pressed={saved}
            aria-label={`${saved ? "Unsave" : "Save"} ${model.name}`}
            onClick={() => box.toggleWish(model.id)}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
          {model.modelUrl && (
            <button
              className="kit-button kit-button-light preview-toggle"
              onClick={() => setIn3D(!in3D)}
            >
              {in3D ? "Picture view" : "Spin in 3D"}
            </button>
          )}
        </div>
        <div className="detail-decision">
          <h3>{model.name}</h3>
          <div className="idea-meta">
            <span>
              <Blocks size={18} /> {match.total} pieces
            </span>
            <span>
              <Clock3 size={18} /> ~{model.minutes} min
            </span>
          </div>
          <div className="detail-actions">
            {match.ready ? (
              onBuild ? (
                <button className="kit-button kit-button-dark detail-cta" onClick={onBuild}>
                  Let’s build <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  className="kit-button kit-button-dark detail-cta"
                  onClick={() => onManageBox("sets")}
                >
                  Open my brick box <ArrowRight size={18} />
                </button>
              )
            ) : (
              <>
                {onBuild && (
                  <button
                    className="kit-button kit-button-light"
                    onClick={onBuild}
                  >
                    <BookOpen size={18} /> View instructions
                  </button>
                )}
                <button
                  className="kit-button kit-button-dark detail-cta"
                  onClick={onFindPieces}
                >
                  <ShoppingBag size={18} /> Find missing pieces
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {!match.ready && (
        <section className="missing-section" aria-labelledby="missing-heading">
          <div className="detail-section-heading">
            <h3 id="missing-heading">The pieces we’re looking for</h3>
            <button
              className="kit-text-button missing-link"
              onClick={() => onManageBox("pieces")}
            >
              Check my extra pieces <ArrowRight size={16} />
            </button>
          </div>
          <div className="missing-pieces">
            {Object.entries(match.missing)
              .slice(0, showAllPieces ? undefined : 6)
              .map(([key, n]) => (
                <div className="missing-piece" key={key}>
                  <img
                    src={
                      partByKey[key].image ??
                      `/demo/parts/${key.replace(":", "-")}.svg`
                    }
                    alt=""
                  />
                  <p>
                    {partByKey[key].colorName}{" "}
                    {partByKey[key].name.replace(/\s+with\s+.+$/i, "")}
                  </p>
                  <strong aria-label={`${n} needed`}>×{n}</strong>
                </div>
              ))}
          </div>
          {Object.keys(match.missing).length > 6 && (
            <button
              className="kit-text-button missing-link"
              aria-expanded={showAllPieces}
              onClick={() => setShowAllPieces(!showAllPieces)}
            >
              See all
              {showAllPieces ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          )}
        </section>
      )}
    </KitDialog>
  );
}
