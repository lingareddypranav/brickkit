"use client";

import dynamic from "next/dynamic";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  Heart,
  LockKeyhole,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { partByKey } from "@/lib/demo/catalog";
import {
  availablePieces,
  matchInventory,
  recommendSets,
} from "@/lib/demo/inventory";
import { instructionsFor } from "@/lib/demo/instructions";
import { protectedSources } from "@/lib/demo/selectors";
import type { Blueprint } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";
import "./build.css";

const ModelScene = dynamic(() => import("./model-scene"), { ssr: false });

export function BuildDetail({
  model,
  box,
  onClose,
  onManageBox,
  onBuild,
}: {
  model: Blueprint;
  box: BrickBox;
  onClose: () => void;
  onManageBox: (tab: "sets" | "pieces") => void;
  onBuild?: () => void;
}) {
  const suppliesRef = useRef<HTMLElement>(null);
  const [showAllPieces, setShowAllPieces] = useState(false);
  const [in3D, setIn3D] = useState(false);
  const [showSupplies, setShowSupplies] = useState(false);
  const available = availablePieces(box.collection);
  const match = matchInventory(model.inventory, available);
  const suggestions = recommendSets(model, available);
  const protectedBricks = protectedSources(model, box.collection);
  const saved = box.collection.wishlist.includes(model.id);
  useEffect(() => {
    if (showSupplies)
      suppliesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [showSupplies]);
  return (
    <KitDialog
      open
      onClose={onClose}
      title={model.name}
      description={model.description}
      wide
    >
      <div className="build-detail-grid">
        <div
          className="detail-preview"
          style={{ background: model.background }}
        >
          {in3D ? (
            <ModelScene model={model} step={0} />
          ) : (
            <img src={model.image} alt={model.name} />
          )}
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
          <span className={`detail-badge ${match.ready ? "is-ready" : ""}`}>
            {match.ready ? <Check size={17} /> : <Sparkles size={17} />}
            {match.ready
              ? "Ready to build"
              : `Need ${match.missingCount} more pieces`}
          </span>
          <h3>
            {match.ready
              ? "Your box has a little magic in it."
              : "A little dream for another day."}
          </h3>
          <p>
            {match.ready
              ? `All ${match.total} pieces are ready. Let’s make something together.`
              : `You have ${match.have} of the ${match.total} pieces. Save this idea, or see what could help.`}
          </p>
          {match.ready ? (
            onBuild ? (
              <button className="kit-button kit-button-dark" onClick={onBuild}>
                Let’s build <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="kit-button kit-button-dark"
                onClick={() => onManageBox("sets")}
              >
                Open my brick box <ArrowRight size={18} />
              </button>
            )
          ) : (
            <button
              className="kit-button kit-button-dark"
              aria-expanded={showSupplies}
              aria-controls="model-supplies"
              onClick={() => {
                setShowSupplies(true);
                suppliesRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              <ShoppingBag size={18} /> Find missing pieces
            </button>
          )}
          {instructionsFor(model.id) && onBuild && (
            <button className="kit-button kit-button-outline" onClick={onBuild}>
              <BookOpen size={18} /> View instructions
            </button>
          )}
          <button
            className="kit-text-button"
            aria-pressed={saved}
            onClick={() => box.toggleWish(model.id)}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved for later" : "Save for later"}
          </button>
        </div>
      </div>
      {model.source && (
        <details className="omr-source">
          <summary>Build details &amp; credits</summary>
          <p>
            {model.source.inventoryBasis === "model"
              ? "This blueprint has its own checked piece list."
              : "For this prototype we check and reserve the full source set’s inventory. Alternate builds may need fewer pieces."}{" "}
            Colour and quantity both count. Source set: {model.source.setId}.
          </p>
          <p>
            Some builds need a grown-up’s help. The time shown is an estimate.
          </p>
          <a href={model.source.url} target="_blank" rel="noopener noreferrer">
            {model.source.provider === "LEGO"
              ? "View original building instructions"
              : "View the original on LDraw OMR"}{" "}
            <ExternalLink size={13} />
          </a>
          <p>
            Model by {model.source.author}. {model.source.license}
          </p>
        </details>
      )}
      {!match.ready && (
        <section className="missing-section" aria-labelledby="missing-heading">
          <div className="detail-section-heading">
            <h3 id="missing-heading">The pieces we’re looking for</h3>
            <button
              className="kit-text-button"
              onClick={() => onManageBox("pieces")}
            >
              Check my extra pieces <ArrowRight size={15} />
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
                  <div>
                    <strong>
                      {n} × {partByKey[key].name}
                    </strong>
                    <p>
                      {partByKey[key].colorName} · {available[key] ?? 0} already
                      in your box
                    </p>
                  </div>
                </div>
              ))}
          </div>
          {Object.keys(match.missing).length > 6 && (
            <button
              className="kit-text-button"
              onClick={() => setShowAllPieces(!showAllPieces)}
            >
              {showAllPieces
                ? "Show fewer pieces"
                : `See all ${Object.keys(match.missing).length} kinds of pieces`}
            </button>
          )}
        </section>
      )}
      {protectedBricks.length > 0 && (
        <div className="protected-hint">
          <LockKeyhole size={21} />
          <div>
            <strong>Some pieces are keeping another adventure together.</strong>
            <p>
              {protectedBricks.map((source) => source.name).join(", ")} could
              help. You decide when it’s time to remix.
            </p>
            <button
              className="kit-text-button"
              onClick={() => onManageBox("sets")}
            >
              Visit my brick box <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
      {showSupplies && !match.ready && (
        <section
          className="supplies-section"
          id="model-supplies"
          ref={suppliesRef}
          aria-labelledby="supplies-heading"
        >
          <div className="detail-section-heading">
            <div>
              <span className="kit-eyebrow">FINISH YOUR BLUEPRINT</span>
              <h3 id="supplies-heading">Sets that help with this build</h3>
            </div>
            <ShoppingBag size={25} />
          </div>
          <p className="supplies-intro">
            You already have {match.have} of the {match.total} checklist pieces.
            These are real sets that add pieces missing from your build. We
            count what is already in your box first.
          </p>
          {suggestions.map((suggestion, index) => (
            <div
              className="shopping-option"
              key={suggestion.sets.map((set) => set.id).join("+")}
            >
              <div className="shopping-number">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <h4>
                  {suggestion.sets.length === 1
                    ? "Add one set"
                    : "Add two sets"}
                </h4>
                <p>
                  {suggestion.remaining === 0
                    ? `Covers all ${match.missingCount} missing pieces`
                    : `Adds ${suggestion.supplied} missing pieces · ${suggestion.remaining} still needed`}
                  {suggestion.unlocks > 1
                    ? ` and unlocks ${suggestion.unlocks} ideas in this catalogue.`
                    : "."}
                </p>
                <div className="donor-sets">
                  {suggestion.sets.map((set) => (
                    <article key={set.id}>
                      <img src={set.image} alt={set.name} />
                      <div>
                        <span className="kit-eyebrow">
                          {set.id.split("-")[0]}
                        </span>
                        <h5>
                          {box.collection.sets[set.id]
                            ? `Another ${set.name}`
                            : set.name}
                        </h5>
                        <a
                          href={`https://www.bricklink.com/v2/catalog/catalogitem.page?S=${set.id}#T=S`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Check on BrickLink <ExternalLink size={13} />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <details className="all-pieces individual-supplies">
            <summary>
              Or shop for just the {match.missingCount} missing pieces
            </summary>
            <div className="shop-links">
              {Object.entries(match.missing).map(([key, n]) => (
                <a
                  key={key}
                  href={`https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(`${partByKey[key].colorName} ${partByKey[key].name}`)}&tab=P#T=P`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find {n} {partByKey[key].name.toLowerCase()}
                  {n > 1 ? "s" : ""} <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </details>
          {!suggestions.length && (
            <p>
              No complete set suggestion in this little catalogue yet. The
              individual pieces can still help.
            </p>
          )}
          <p className="shop-note">
            Check colour, quantity, price, and availability with the seller. Add
            a set to your brick box after you have it.
          </p>
          <div className="already-owned">
            <div>
              <strong>Found these pieces at home?</strong>
              <p>Only add them if they’re already yours.</p>
            </div>
            <button
              className="kit-button kit-button-outline"
              onClick={() => {
                for (const [key, n] of Object.entries(match.missing))
                  box.adjustLoose(key, n);
              }}
            >
              Add to my extra pieces <Check size={16} />
            </button>
          </div>
        </section>
      )}
      {match.ready && (
        <details className="all-pieces">
          <summary>Find all {match.total} pieces in your box</summary>
          <div className="detail-parts">
            {Object.entries(model.inventory).map(([key, n]) => (
              <span key={key}>
                {n} × {partByKey[key].colorName}{" "}
                {partByKey[key].name.toLowerCase()}
              </span>
            ))}
          </div>
        </details>
      )}
    </KitDialog>
  );
}
