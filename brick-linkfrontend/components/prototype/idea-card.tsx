"use client";
import {
  ArrowRight,
  Blocks,
  Check,
  Clock3,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Blueprint, Match } from "@/lib/demo/types";

/** Pure presentation: inventory decisions and persistence live outside this card. */
export function IdeaCard({
  model,
  match,
  saved,
  onOpen,
  onSave,
}: {
  model: Blueprint;
  match: Match;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const labels = {
    rides: "ON THE MOVE",
    animals: "A NEW LITTLE FRIEND",
    dinosaurs: "A PREHISTORIC PAL",
    dragons: "A LITTLE BIT OF MAGIC",
    space: "BEYOND THE MOON",
  };
  return (
    <article className="idea-card">
      <div className="idea-art" style={{ background: model.background }}>
        <button
          className="idea-open"
          onClick={onOpen}
          aria-label={`See ${model.name}`}
        >
          <img src={model.image} alt={model.name} />
        </button>
        <span
          className={`build-status ${match.ready ? "status-ready" : "status-dream"}`}
        >
          {match.ready ? <Check size={14} /> : <Sparkles size={14} />}
          {match.ready ? "Ready to build" : `Need ${match.missingCount} pieces`}
        </span>
        <button
          className={`wish-button ${saved ? "is-wished" : ""}`}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} ${model.name}`}
          onClick={onSave}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="idea-card-body">
        <div>
          <span className="model-family">{labels[model.family]}</span>
          <h3>
            <button onClick={onOpen}>{model.name}</button>
          </h3>
          <p>{model.description}</p>
        </div>
        <div className="idea-meta">
          <span>
            <Blocks size={14} /> {match.total} pieces
          </span>
          <span>
            <Clock3 size={14} /> {model.minutes} min
          </span>
          <button onClick={onOpen} aria-label={`Open ${model.name}`}>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
