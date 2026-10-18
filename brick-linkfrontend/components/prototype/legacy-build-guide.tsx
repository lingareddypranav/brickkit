"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Cuboid,
  Image as ImageIcon,
  LockKeyhole,
  Printer,
  Sparkles,
} from "lucide-react";
import type { BrickBox } from "@/hooks/use-brick-box";
import { useBuildSession } from "@/hooks/use-build-session";
import { partByKey } from "@/lib/demo/catalog";
import type { Blueprint } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";

const ModelScene = dynamic(() => import("./legacy-model-scene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">Opening your little world…</div>
  ),
});

export function LegacyBuildGuide({
  model,
  box,
  onClose,
  onShelf,
}: {
  model: Blueprint;
  box: BrickBox;
  onClose: () => void;
  onShelf: () => void;
}) {
  const session = useBuildSession(model, box.collection);
  const [in3D, setIn3D] = useState(false);
  return (
    <KitDialog
      open
      onClose={onClose}
      title={session.saved ? "Look what you made!" : model.name}
      description={
        session.saved
          ? "A little idea. A whole lot of imagination."
          : `Let’s make it together · Step ${session.step + 1} of ${model.steps.length}`
      }
      wide
    >
      {session.saved ? (
        <div className="build-celebration">
          <div className="celebration-stars" aria-hidden="true">
            ✦ <Sparkles size={32} /> ✦
          </div>
          <img src={model.image} alt={model.name} />
          <h3>You made {model.name}!</h3>
          <p>
            {session.keepBuilt
              ? "Its bricks are saved for this creation. Keep it as long as you like."
              : "Its bricks are ready for another adventure whenever you are."}
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
          <div
            className="guide-progress"
            aria-label={`Step ${session.step + 1} of ${model.steps.length}`}
          >
            {model.steps.map((_, i) => (
              <span
                className={i <= session.step ? "is-complete" : ""}
                key={i}
              />
            ))}
          </div>
          <div className="guide-title">
            <div>
              <span className="kit-eyebrow">STEP {session.step + 1}</span>
              <h3>{model.steps[session.step]}</h3>
            </div>
            <button className="kit-text-button" onClick={() => setIn3D(!in3D)}>
              {in3D ? <ImageIcon size={17} /> : <Cuboid size={17} />}{" "}
              {in3D ? "Picture view" : "Spin in 3D"}
            </button>
          </div>
          <div className="guide-stage" style={{ background: model.background }}>
            {in3D ? (
              <ModelScene model={model} step={session.step} />
            ) : (
              <img
                src={`/demo/steps/${model.id}-${session.step + 1}.svg`}
                alt={`${model.steps[session.step]}: ${model.name} so far`}
              />
            )}
          </div>
          {in3D && (
            <p className="guide-tip">
              Drag to turn your creation. Pinch or scroll to look closer.
            </p>
          )}
          <div className="step-pieces">
            <h4>Find these pieces</h4>
            <div>
              {Object.entries(session.pieces).map(([key, n]) => (
                <div className="step-piece" key={key}>
                  <img
                    src={`/demo/parts/${key.replace(":", "-")}.svg`}
                    alt={`${partByKey[key].colorName} ${partByKey[key].name}`}
                  />
                  <span>{n} ×</span>
                </div>
              ))}
            </div>
          </div>
          {!session.ready && (
            <p className="collection-changed" role="status">
              Your brick box changed. Make these pieces available again before
              saving your creation.
            </p>
          )}
          {session.lastStep && (
            <label className="finish-lock">
              <input
                type="checkbox"
                checked={session.keepBuilt}
                onChange={(e) => session.setKeepBuilt(e.target.checked)}
              />
              <LockKeyhole size={20} />
              <span>
                <strong>Keep my {model.name.toLowerCase()} built</strong>
                <small>Save these bricks for this creation.</small>
              </span>
            </label>
          )}
          <div className="guide-actions">
            <button
              className="kit-button kit-button-outline"
              disabled={session.step === 0}
              onClick={session.back}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              className="kit-text-button print-button"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print all steps
            </button>
            {session.lastStep ? (
              <button
                className="kit-button kit-button-dark"
                disabled={!session.ready}
                onClick={() => {
                  if (!session.ready || session.saved) return;
                  box.saveCreation(model.id, session.keepBuilt);
                  session.setSaved(true);
                }}
              >
                I made it! <CheckCheck size={19} />
              </button>
            ) : (
              <button
                className="kit-button kit-button-dark"
                onClick={session.next}
              >
                Next step <ArrowRight size={18} />
              </button>
            )}
          </div>
        </>
      )}
      <div className="print-instructions">
        <h1>{model.name}</h1>
        <p>{model.description}</p>
        {model.steps.map((step, i) => (
          <section key={i}>
            <h2>
              {i + 1}. {step}
            </h2>
            <img src={`/demo/steps/${model.id}-${i + 1}.svg`} alt={step} />
          </section>
        ))}
      </div>
    </KitDialog>
  );
}
