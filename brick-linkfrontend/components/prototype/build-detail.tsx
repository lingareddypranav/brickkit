"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Heart,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { partByKey } from "@/lib/demo/catalog";
import {
  availablePieces,
  matchInventory,
  recommendSets,
} from "@/lib/demo/inventory";
import { protectedSources } from "@/lib/demo/selectors";
import type { Blueprint } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";
import "./build.css";

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
  const [grownUp, setGrownUp] = useState(false);
  const available = availablePieces(box.collection);
  const match = matchInventory(model.inventory, available);
  const suggestions = recommendSets(model, available);
  const protectedBricks = protectedSources(model, box.collection);
  const saved = box.collection.wishlist.includes(model.id);
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
          <img src={model.image} alt={model.name} />
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
              onClick={() => setGrownUp(true)}
            >
              <Users size={18} /> Show a grown-up
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
            {Object.entries(match.missing).map(([key, n]) => (
              <div className="missing-piece" key={key}>
                <img src={`/demo/parts/${key.replace(":", "-")}.svg`} alt="" />
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
      {grownUp && !match.ready && (
        <section
          className="grown-up-section"
          aria-labelledby="grown-up-heading"
        >
          <div className="detail-section-heading">
            <div>
              <span className="kit-eyebrow">A LITTLE HELP FROM A GROWN-UP</span>
              <h3 id="grown-up-heading">A few ways to make it happen</h3>
            </div>
            <Users size={25} />
          </div>
          <div className="shopping-option">
            <div className="shopping-number">01</div>
            <div>
              <h4>Just the missing pieces</h4>
              <p>
                Find the {match.missingCount} pieces above without adding a
                whole set.
              </p>
              <div className="shop-links">
                {Object.entries(match.missing).map(([key, n]) => (
                  <a
                    key={key}
                    href={`https://www.bricklink.com/v2/catalog/catalogitem.page?P=${encodeURIComponent(partByKey[key].part)}#T=S`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find {n} {partByKey[key].name.toLowerCase()}
                    {n > 1 ? "s" : ""} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </div>
          </div>
          {suggestions.map((suggestion, index) => (
            <div
              className="shopping-option"
              key={suggestion.sets.map((set) => set.id).join("+")}
            >
              <div className="shopping-number">0{index + 2}</div>
              <div>
                <h4>
                  {suggestion.sets.length === 1
                    ? "One set that can help"
                    : "Two sets that work together"}
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
          {!suggestions.length && (
            <p>
              No complete set suggestion in this little catalogue yet. The
              individual pieces above can still help.
            </p>
          )}
          <p className="shop-note">
            Check colour, quantity, price, and availability with the seller.
            Visiting a shop won’t add anything to your brick box.
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
