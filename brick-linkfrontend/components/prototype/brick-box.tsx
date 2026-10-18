"use client";

import { useState } from "react";
import {
  Blocks,
  Check,
  LockKeyhole,
  Minus,
  Plus,
  RotateCcw,
  Search,
  UnlockKeyhole,
} from "lucide-react";
import { models, modelById, parts, sets } from "@/lib/demo/catalog";
import {
  availablePieces,
  countPieces,
  matchInventory,
} from "@/lib/demo/inventory";
import type { BrickBox } from "@/hooks/use-brick-box";
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
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState<"sample" | "empty" | null>(
    null,
  );
  const available = availablePieces(box.collection);
  const ownedSets = Object.values(box.collection.sets).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const listedSets = sets.filter((set) =>
    `${set.name} ${set.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const listedParts = parts.filter((part) =>
    `${part.name} ${part.colorName} ${part.part}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <KitDialog
      open={open}
      onClose={onClose}
      title="My brick box"
      description="Your sets, your extra pieces, your next big idea."
      wide
    >
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
              setTab(ids[next]);
              setQuery("");
              document.getElementById(`box-tab-${ids[next]}`)?.focus();
            }}
            aria-selected={tab === id}
            key={id}
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
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
        {tab !== "made" && (
          <label className="kit-search">
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "sets"
                  ? "Find a set by name or number"
                  : "Find a shape or colour"
              }
              aria-label={tab === "sets" ? "Find a set" : "Find an extra piece"}
            />
          </label>
        )}
        {tab === "sets" && (
          <>
            <p className="kit-helper">
              Pick the sets you own. Keep a favourite built to save its bricks
              for later.
            </p>
            <div className="set-grid">
              {listedSets.map((set) => {
                const owned = box.collection.sets[set.id];
                return (
                  <article
                    key={set.id}
                    className={`set-card ${owned ? "is-owned" : ""}`}
                  >
                    <div className="set-image">
                      <img src={set.image} alt={set.name} loading="lazy" />
                      {owned && (
                        <span className="owned-label">
                          <Check size={13} /> In my box
                        </span>
                      )}
                    </div>
                    <div className="set-card-body">
                      <span className="kit-eyebrow">
                        {set.id.split("-")[0]} · {set.pieces} pieces
                      </span>
                      <h3>{set.name}</h3>
                      {owned ? (
                        <>
                          <Counter
                            value={owned.quantity}
                            name={set.name}
                            onDecrease={() =>
                              box.setQuantity(set.id, owned.quantity - 1)
                            }
                            onIncrease={() =>
                              box.setQuantity(set.id, owned.quantity + 1)
                            }
                            max={9}
                          />
                          <button
                            type="button"
                            className={`keep-built ${owned.keepBuilt ? "is-locked" : ""}`}
                            aria-pressed={owned.keepBuilt}
                            onClick={() => box.toggleSet(set.id)}
                          >
                            {owned.keepBuilt ? (
                              <LockKeyhole size={17} />
                            ) : (
                              <UnlockKeyhole size={17} />
                            )}
                            <span>
                              {owned.keepBuilt
                                ? "Keeping this built"
                                : "Keep this built"}
                            </span>
                          </button>
                          <p className="set-note">
                            {owned.keepBuilt
                              ? "Its bricks are safe. We won’t use them."
                              : "Its bricks are ready for a new adventure."}
                          </p>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="kit-button kit-button-dark"
                          onClick={() => box.setQuantity(set.id, 1)}
                        >
                          <Plus size={17} /> I have this set
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
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
                    src={`/demo/parts/${part.key.replace(":", "-")}.svg`}
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
            <p className="kit-helper">
              A favourite can stay just as it is. Remix it when you’re ready for
              something new.
            </p>
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
                <h3>A whole shelf of possibilities</h3>
                <p>Finish your first mini build and it will live here.</p>
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
        <button className="kit-button kit-button-dark" onClick={onClose}>
          Done <Check size={17} />
        </button>
      </div>
      {box.storageError && (
        <p role="status" className="kit-storage-note">
          This browser couldn’t save your box. Keep this tab open to keep your
          changes.
        </p>
      )}
    </KitDialog>
  );
}
