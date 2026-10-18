"use client";

import { useEffect, useState } from "react";
import {
  Blocks,
  Check,
  Hash,
  LockKeyhole,
  Minus,
  Plus,
  RotateCcw,
  Search,
  UnlockKeyhole,
} from "lucide-react";
import { modelById, parts, sets } from "@/lib/demo/catalog";
import {
  availablePieces,
  countPieces,
  matchInventory,
} from "@/lib/demo/inventory";
import type { BrickBox } from "@/hooks/use-brick-box";
import type { BrickSet } from "@/lib/demo/types";
import { KitDialog } from "./kit-dialog";

function Counter({
  value,
  onDecrease,
  onIncrease,
  name,
  max = 999,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  name: string;
  max?: number;
}) {
  return (
    <div className="kit-counter">
      <button
        type="button"
        aria-label={`Remove one ${name}`}
        onClick={onDecrease}
        disabled={value === 0}
      >
        <Minus size={17} />
      </button>
      <output aria-label={`${name} quantity`}>{value}</output>
      <button
        type="button"
        aria-label={`Add one ${name}`}
        onClick={onIncrease}
        disabled={value >= max}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}

function SetCard({ set, box }: { set: BrickSet; box: BrickBox }) {
  const owned = box.collection.sets[set.id];
  return (
    <article className="idea-card set-card">
      <div className="idea-art">
        <img src={set.image} alt={set.name} loading="lazy" />
        {owned && (
          <span className="build-status status-ready">
            <Check size={14} /> In my box
          </span>
        )}
        {owned && (
          <button
            type="button"
            className={`wish-button ${owned.keepBuilt ? "is-wished" : ""}`}
            aria-pressed={owned.keepBuilt}
            aria-label={
              owned.keepBuilt
                ? `Keeping ${set.name} built`
                : `Keep ${set.name} built`
            }
            title={owned.keepBuilt ? "Keeping this built" : "Keep this built"}
            onClick={() => box.toggleSet(set.id)}
          >
            {owned.keepBuilt ? (
              <LockKeyhole size={18} />
            ) : (
              <UnlockKeyhole size={18} />
            )}
          </button>
        )}
      </div>
      <div className="idea-card-body">
        <h3>{set.name}</h3>
        {owned ? (
          <Counter
            value={owned.quantity}
            name={set.name}
            onDecrease={() => box.setQuantity(set.id, owned.quantity - 1)}
            onIncrease={() => box.setQuantity(set.id, owned.quantity + 1)}
            max={9}
          />
        ) : (
          <button
            type="button"
            className="kit-button kit-button-dark"
            onClick={() => box.setQuantity(set.id, 1)}
          >
            <Plus size={17} /> I have this set
          </button>
        )}
        <div className="idea-meta set-meta">
          <span>
            <Hash size={18} aria-hidden="true" /> {set.id.split("-")[0]}
          </span>
          <span className={owned?.keepBuilt ? "is-locked" : undefined}>
            {owned?.keepBuilt ? (
              <LockKeyhole size={18} aria-hidden="true" />
            ) : (
              <Blocks size={18} aria-hidden="true" />
            )}{" "}
            {set.pieces} pieces
          </span>
        </div>
      </div>
    </article>
  );
}

export function BrickBoxDialog({
  box,
  open,
  onClose,
  initialTab = "sets",
}: {
  box: BrickBox;
  open: boolean;
  onClose: () => void;
  initialTab?: "sets" | "pieces" | "made";
}) {
  return (
    <KitDialog
      open={open}
      onClose={onClose}
      title="Your sets, extra pieces, and creations"
      description="Add sets, loose pieces, and track what you’ve built."
      wide
    >
      <BrickBoxPanel box={box} initialTab={initialTab} onDone={onClose} />
    </KitDialog>
  );
}

export function BrickBoxPanel({
  box,
  initialTab = "sets",
  docked = false,
  onDone,
  onTabChange,
}: {
  box: BrickBox;
  initialTab?: "sets" | "pieces" | "made";
  docked?: boolean;
  onDone?: () => void;
  onTabChange?: (tab: "sets" | "pieces" | "made") => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [addingSet, setAddingSet] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState<"sample" | "empty" | null>(
    null,
  );

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function selectTab(next: "sets" | "pieces" | "made") {
    setTab(next);
    setQuery("");
    setAddingSet(false);
    setAddQuery("");
    onTabChange?.(next);
  }
  const available = availablePieces(box.collection);
  const ownedSets = Object.values(box.collection.sets).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const listedSets = sets.filter((set) =>
    `${set.name} ${set.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const popupSets = sets.filter((set) =>
    `${set.name} ${set.id}`.toLowerCase().includes(addQuery.toLowerCase()),
  );
  const listedParts = parts.filter((part) =>
    `${part.name} ${part.colorName} ${part.part}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className={docked ? "box-pane" : undefined}>
      {docked && (
        <header className="box-pane-heading">
          <h2 id="box-heading">Your sets, extra pieces, and creations</h2>
        </header>
      )}
      <div className="box-summary">
        <Blocks size={22} />
        <span>
          <strong>{ownedSets}</strong> sets <span aria-hidden="true">·</span>{" "}
          <strong>{countPieces(available)}</strong> pieces ready to remix
        </span>
      </div>
      <div className="kit-tabs" role="tablist" aria-label="Brick box">
        {(
          [
            ["sets", "My sets"],
            ["pieces", "Extra pieces"],
            ["made", "My creations"],
          ] as const
        ).map(([id, label]) => (
          <button
            id={`box-tab-${id}`}
            aria-controls={`box-panel-${id}`}
            role="tab"
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              const ids = ["sets", "pieces", "made"] as const;
              const index = ids.indexOf(id);
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % ids.length;
              else if (event.key === "ArrowLeft")
                next = (index + ids.length - 1) % ids.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = ids.length - 1;
              else return;
              event.preventDefault();
              selectTab(ids[next]);
              document.getElementById(`box-tab-${ids[next]}`)?.focus();
            }}
            aria-selected={tab === id}
            key={id}
            onClick={() => selectTab(id)}
          >
            {label}
            {id === "made" && box.collection.creations.length > 0
              ? ` (${box.collection.creations.length})`
              : ""}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`box-panel-${tab}`}
        aria-labelledby={`box-tab-${tab}`}
        className="box-panel"
      >
        {tab === "pieces" && (
          <label className="kit-search">
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a shape or colour"
              aria-label="Find an extra piece"
            />
          </label>
        )}
        {tab === "sets" && (
          <>
            <div className="idea-grid set-grid">
              <article className="idea-card set-card add-set-card">
                <button
                  type="button"
                  className="add-set-open"
                  onClick={() => setAddingSet(true)}
                >
                  <Plus size={48} strokeWidth={1.5} />
                  Add set
                </button>
              </article>
              {listedSets.map((set) => (
                <SetCard key={set.id} set={set} box={box} />
              ))}
            </div>
            <KitDialog
              open={addingSet}
              onClose={() => {
                setAddingSet(false);
                setAddQuery("");
              }}
              title="Add a set"
              description="Search a set name or number."
              wide
            >
              <label className="kit-search">
                <Search size={19} />
                <input
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="Search set name or number"
                  aria-label="Search set name or number"
                />
              </label>
              <div className="idea-grid set-grid add-set-catalog">
                {popupSets.map((set) => (
                  <SetCard key={set.id} set={set} box={box} />
                ))}
              </div>
              {!popupSets.length && (
                <div className="kit-empty">
                  <Search />
                  <h3>No set here yet</h3>
                  <p>Try a different name or number.</p>
                </div>
              )}
            </KitDialog>
            {!listedSets.length && (
              <div className="kit-empty">
                <Search />
                <h3>No set here yet</h3>
                <p>
                  This little catalogue has six sets to try. Search a different
                  name or number.
                </p>
              </div>
            )}
          </>
        )}
        {tab === "pieces" && (
          <>
            <p className="kit-helper">
              Add loose pieces from your own box. Your sets’ pieces are already
              counted.
            </p>
            <div className="piece-grid">
              {listedParts.map((part) => (
                <article className="piece-card" key={part.key}>
                  <img
                    src={
                      part.image ??
                      `/demo/parts/${part.key.replace(":", "-")}.svg`
                    }
                    alt=""
                  />
                  <h3>{part.name}</h3>
                  <p>{part.colorName}</p>
                  <Counter
                    value={box.collection.loose[part.key] ?? 0}
                    name={`${part.colorName} ${part.name}`}
                    onDecrease={() => box.adjustLoose(part.key, -1)}
                    onIncrease={() => box.adjustLoose(part.key, 1)}
                  />
                </article>
              ))}
            </div>
            {!listedParts.length && (
              <div className="kit-empty">
                <Search />
                <h3>Try another shape or colour</h3>
                <p>Only the pieces used in our mini builds are in this box.</p>
              </div>
            )}
          </>
        )}
        {tab === "made" && (
          <>
            {box.collection.creations.length ? (
              <div className="creation-list">
                {box.collection.creations.map((creation) => {
                  const model = modelById[creation.modelId];
                  const canKeep =
                    creation.keepBuilt ||
                    matchInventory(model.inventory, available).ready;
                  return (
                    <article className="creation-row" key={creation.id}>
                      <img
                        src={model.image}
                        alt=""
                        style={{ background: model.background }}
                      />
                      <div>
                        <h3>{model.name}</h3>
                        <p>
                          {creation.keepBuilt
                            ? "Its pieces are saved for this creation."
                            : "Its pieces can become something new."}
                        </p>
                        <button
                          className={`keep-built ${creation.keepBuilt ? "is-locked" : ""}`}
                          aria-pressed={creation.keepBuilt}
                          disabled={!canKeep}
                          onClick={() => box.toggleCreation(creation.id)}
                        >
                          {creation.keepBuilt ? (
                            <LockKeyhole size={17} />
                          ) : (
                            <UnlockKeyhole size={17} />
                          )}
                          {creation.keepBuilt
                            ? "Keeping this built"
                            : "Keep this built"}
                        </button>
                        {!canKeep && (
                          <small>
                            Some pieces are being used in another build.
                          </small>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="kit-empty">
                <Blocks size={38} />
                <h3>Your creations will live here</h3>
              </div>
            )}
          </>
        )}
      </div>
      <div className="box-footer">
        {confirmReset ? (
          <div className="reset-confirm">
            <span>
              {confirmReset === "sample"
                ? "Replace this box with the sample?"
                : "Empty your box and saved creations?"}
            </span>
            <button
              className="kit-text-button"
              onClick={() => setConfirmReset(null)}
            >
              Cancel
            </button>
            <button
              className="kit-button kit-button-dark"
              onClick={() => {
                confirmReset === "sample" ? box.loadSample() : box.startEmpty();
                setConfirmReset(null);
              }}
            >
              Yes, start fresh
            </button>
          </div>
        ) : (
          <>
            <button
              className="kit-text-button"
              onClick={() => setConfirmReset("sample")}
            >
              <RotateCcw size={15} /> Try the sample box
            </button>
            <button
              className="kit-text-button"
              onClick={() => setConfirmReset("empty")}
            >
              Start with my own box
            </button>
          </>
        )}
        {onDone && (
          <button className="kit-button kit-button-dark" onClick={onDone}>
            Done <Check size={17} />
          </button>
        )}
      </div>
      {box.storageError && (
        <p role="status" className="kit-storage-note">
          This browser couldn’t save your box. Keep this tab open to keep your
          changes.
        </p>
      )}
    </div>
  );
}
