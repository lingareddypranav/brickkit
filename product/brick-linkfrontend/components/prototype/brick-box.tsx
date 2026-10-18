"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Blocks,
  Check,
  ExternalLink,
  Hash,
  Heart,
  ImagePlus,
  LockKeyhole,
  Minus,
  Plus,
  RotateCcw,
  Search,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { modelById, partByKey, parts, sets } from "@/lib/demo/catalog";
import {
  availablePieces,
  countPieces,
  matchInventory,
  recommendSets,
} from "@/lib/demo/inventory";
import {
  guessPieces,
  matchSets,
  samplePhotoColors,
  shapeOrder,
  type PieceGuess,
} from "@/lib/demo/photo-match";
import type { BrickBox } from "@/hooks/use-brick-box";
import type { Blueprint, BrickSet, Shape } from "@/lib/demo/types";
import { IdeaCard } from "./idea-card";
import { KitDialog } from "./kit-dialog";

export type BoxTab = "sets" | "pieces" | "made" | "saved";
const BOX_TABS = ["sets", "pieces", "made", "saved"] as const;

const PIECE_HUES = [
  { id: "black", label: "Black", hex: "#05131D" },
  { id: "gray", label: "Gray", hex: "#9BA19D" },
  { id: "white", label: "White", hex: "#FFFFFF" },
  { id: "red", label: "Red", hex: "#C91A09" },
  { id: "orange", label: "Orange", hex: "#FE8A18" },
  { id: "yellow", label: "Yellow", hex: "#F2CD37" },
  { id: "green", label: "Green", hex: "#237841" },
  { id: "blue", label: "Blue", hex: "#0055BF" },
  { id: "brown", label: "Brown", hex: "#583927" },
] as const;

function pieceHue(name: string) {
  const n = name.toLowerCase();
  if (n.includes("brown")) return "brown";
  if (n.includes("black")) return "black";
  if (n.includes("white")) return "white";
  if (n.includes("gray") || n.includes("grey") || n.includes("silver"))
    return "gray";
  if (n.includes("red")) return "red";
  if (n.includes("orange")) return "orange";
  if (n.includes("yellow") || n.includes("gold")) return "yellow";
  if (n.includes("green") || n.includes("aqua")) return "green";
  if (n.includes("blue") || n.includes("azure")) return "blue";
  if (n.includes("tan")) return "brown";
  return "other";
}

function shapeLabel(shape: Shape) {
  if (shape === "tyre") return "Tyre";
  return shape[0].toUpperCase() + shape.slice(1);
}

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
          <span className="build-status status-ready" aria-label="In my box">
            <Check size={18} />
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

function NeededBuild({
  model,
  box,
  onBack,
}: {
  model: Blueprint;
  box: BrickBox;
  onBack?: () => void;
}) {
  const available = availablePieces(box.collection);
  const match = matchInventory(model.inventory, available);
  const suggestions = recommendSets(model, available);
  const missing = Object.entries(match.missing);
  return (
    <div className="box-needed">
      <button type="button" className="box-needed-back" onClick={onBack}>
        <ArrowLeft size={18} /> My brick box
      </button>
      <header className="box-pane-heading">
        <h2 id="box-heading">{model.name}</h2>
        <p>
          You have {match.have} of {match.total} pieces.
          {match.ready
            ? " Nothing else to buy for this build."
            : ` ${match.missingCount} still missing.`}
        </p>
      </header>
      {!match.ready && (
        <div className="box-needed-columns">
          <section aria-labelledby="needed-sets">
            <h3 id="needed-sets">Sets to buy</h3>
            {suggestions.length ? (
              <div className="buy-sets">
                {suggestions.map((suggestion) => (
                  <article
                    className="buy-set"
                    key={suggestion.sets.map((set) => set.id).join("+")}
                  >
                    <div className="buy-set-photos">
                      {suggestion.sets.map((set) => (
                        <img key={set.id} src={set.image} alt="" />
                      ))}
                    </div>
                    <div>
                      <h4>
                        {suggestion.sets
                          .map((set) =>
                            box.collection.sets[set.id]
                              ? `Another ${set.name}`
                              : set.name,
                          )
                          .join(" + ")}
                      </h4>
                      <p>
                        {suggestion.remaining === 0
                          ? `Covers all ${match.missingCount} missing pieces`
                          : `Adds ${suggestion.supplied} missing pieces`}
                      </p>
                    </div>
                    <div className="buy-set-links">
                      {suggestion.sets.map((set) => (
                        <a
                          key={set.id}
                          href={`https://www.bricklink.com/v2/catalog/catalogitem.page?S=${set.id}#T=S`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${set.name} on BrickLink`}
                        >
                          <ExternalLink size={18} />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="box-needed-empty">
                No set in this catalogue covers these pieces.
              </p>
            )}
          </section>
          <section aria-labelledby="needed-pieces">
            <h3 id="needed-pieces">Missing pieces</h3>
            <div className="missing-pieces">
              {missing.map(([key, n]) => (
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
                  <strong>×{n}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
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
  initialTab?: BoxTab;
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
  onOpenModel,
  needed = null,
  onClearNeeded,
}: {
  box: BrickBox;
  initialTab?: BoxTab;
  docked?: boolean;
  onDone?: () => void;
  onTabChange?: (tab: BoxTab) => void;
  onOpenModel?: (model: Blueprint) => void;
  needed?: Blueprint | null;
  onClearNeeded?: () => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [addingSet, setAddingSet] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [shapeFilter, setShapeFilter] = useState<Shape | "all">("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "color" | "size">("name");
  const [setPhoto, setSetPhoto] = useState<string | null>(null);
  const [photoSets, setPhotoSets] = useState<BrickSet[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanPhoto, setScanPhoto] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const [guesses, setGuesses] = useState<PieceGuess[]>([]);
  const setFileRef = useRef<HTMLInputElement>(null);
  const pieceFileRef = useRef<HTMLInputElement>(null);
  const setPhotoUrl = useRef<string | null>(null);
  const scanPhotoUrl = useRef<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (setPhotoUrl.current) URL.revokeObjectURL(setPhotoUrl.current);
      if (scanPhotoUrl.current) URL.revokeObjectURL(scanPhotoUrl.current);
    };
  }, []);

  function rememberPhoto(
    file: File | null,
    urlRef: { current: string | null },
    setUrl: (url: string | null) => void,
  ) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    urlRef.current = url;
    setUrl(url);
    return url;
  }

  function closeAddSet() {
    setAddingSet(false);
    setAddQuery("");
    setPhotoSets([]);
    setPhotoNote("");
    setPhotoBusy(false);
    rememberPhoto(null, setPhotoUrl, setSetPhoto);
    if (setFileRef.current) setFileRef.current.value = "";
  }

  function closeScan() {
    setScanning(false);
    setGuesses([]);
    setScanNote("");
    setScanBusy(false);
    rememberPhoto(null, scanPhotoUrl, setScanPhoto);
    if (pieceFileRef.current) pieceFileRef.current.value = "";
  }

  function selectTab(next: BoxTab) {
    setTab(next);
    setQuery("");
    closeAddSet();
    closeScan();
    onTabChange?.(next);
  }

  async function onSetPhoto(file: File) {
    if (setFileRef.current) setFileRef.current.value = "";
    const url = rememberPhoto(file, setPhotoUrl, setSetPhoto);
    setPhotoBusy(true);
    setPhotoNote("");
    setPhotoSets([]);
    try {
      const matches = matchSets(await samplePhotoColors(file));
      if (setPhotoUrl.current !== url) return;
      setPhotoSets(matches);
      if (!matches.length)
        setPhotoNote("No close set in this catalogue. Try the search.");
    } catch {
      if (setPhotoUrl.current !== url) return;
      setPhotoNote("Couldn’t read that image. Try another photo.");
    } finally {
      if (setPhotoUrl.current === url) setPhotoBusy(false);
    }
  }

  async function onPiecePhoto(file: File) {
    if (pieceFileRef.current) pieceFileRef.current.value = "";
    const url = rememberPhoto(file, scanPhotoUrl, setScanPhoto);
    setScanning(true);
    setScanBusy(true);
    setScanNote("");
    setGuesses([]);
    try {
      const next = guessPieces(await samplePhotoColors(file));
      if (scanPhotoUrl.current !== url) return;
      setGuesses(next);
      if (!next.length)
        setScanNote(
          "Couldn’t pick pieces out of this photo. Try a closer shot on a plain background.",
        );
    } catch {
      if (scanPhotoUrl.current !== url) return;
      setScanNote("Couldn’t read that image. Try another photo.");
    } finally {
      if (scanPhotoUrl.current === url) setScanBusy(false);
    }
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
  const listedParts = parts
    .filter((part) => {
      if (shapeFilter !== "all" && part.shape !== shapeFilter) return false;
      if (colorFilter !== "all" && pieceHue(part.colorName) !== colorFilter)
        return false;
      return `${part.name} ${part.colorName} ${part.part}`
        .toLowerCase()
        .includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "color")
        return (
          a.colorName.localeCompare(b.colorName) || a.name.localeCompare(b.name)
        );
      if (sortBy === "size")
        return (
          b.width * b.depth - a.width * a.depth ||
          b.height - a.height ||
          a.name.localeCompare(b.name)
        );
      return a.name.localeCompare(b.name) || a.colorName.localeCompare(b.colorName);
    });
  const guessGroups = guesses.reduce<{ color: string; items: PieceGuess[] }[]>(
    (groups, guess) => {
      const color = partByKey[guess.key]?.colorName ?? "Other";
      const group = groups.find((item) => item.color === color);
      if (group) group.items.push(guess);
      else groups.push({ color, items: [guess] });
      return groups;
    },
    [],
  );

  return (
    <div className={docked ? "box-pane" : undefined}>
      {needed ? (
        <NeededBuild model={needed} box={box} onBack={onClearNeeded} />
      ) : null}
      {docked && !needed && (
        <header className="box-pane-heading">
          <h2 id="box-heading">Your sets, extra pieces, and creations</h2>
        </header>
      )}
      {!needed && (
      <>
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
            ["saved", "Saved"],
          ] as const
        ).map(([id, label]) => (
          <button
            id={`box-tab-${id}`}
            aria-controls={`box-panel-${id}`}
            role="tab"
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              const index = BOX_TABS.indexOf(id);
              let next = index;
              if (event.key === "ArrowRight")
                next = (index + 1) % BOX_TABS.length;
              else if (event.key === "ArrowLeft")
                next = (index + BOX_TABS.length - 1) % BOX_TABS.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = BOX_TABS.length - 1;
              else return;
              event.preventDefault();
              selectTab(BOX_TABS[next]);
              document.getElementById(`box-tab-${BOX_TABS[next]}`)?.focus();
            }}
            aria-selected={tab === id}
            key={id}
            onClick={() => selectTab(id)}
          >
            {label}
            {id === "made" && box.collection.creations.length > 0
              ? ` (${box.collection.creations.length})`
              : ""}
            {id === "saved" && box.collection.wishlist.length > 0
              ? ` (${box.collection.wishlist.length})`
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
          <div className="piece-head">
            <div className="piece-tools">
              <label className="kit-search">
                <Search size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a shape or colour"
                  aria-label="Find an extra piece"
                />
              </label>
              <label className="piece-select">
                <select
                  value={shapeFilter}
                  aria-label="Shape"
                  onChange={(event) =>
                    setShapeFilter(event.target.value as Shape | "all")
                  }
                >
                  <option value="all">All shapes</option>
                  {shapeOrder.map((shape) => (
                    <option key={shape} value={shape}>
                      {shapeLabel(shape)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="color-swatches" role="group" aria-label="Colour">
                {PIECE_HUES.map((hue) => (
                  <button
                    type="button"
                    key={hue.id}
                    aria-label={hue.label}
                    aria-pressed={colorFilter === hue.id}
                    title={hue.label}
                    style={{ backgroundColor: hue.hex }}
                    onClick={() =>
                      setColorFilter(colorFilter === hue.id ? "all" : hue.id)
                    }
                  />
                ))}
              </div>
              <label className="piece-select">
                <select
                  value={sortBy}
                  aria-label="Sort pieces"
                  onChange={(event) =>
                    setSortBy(event.target.value as "name" | "color" | "size")
                  }
                >
                  <option value="name">Name</option>
                  <option value="color">Colour</option>
                  <option value="size">Size</option>
                </select>
              </label>
              <button
                type="button"
                className="kit-button kit-button-outline"
                onClick={() => setScanning(true)}
              >
                <ImagePlus size={17} /> Scan pieces
              </button>
              <input
                ref={pieceFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onPiecePhoto(file);
                }}
              />
            </div>
          </div>
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
              onClose={closeAddSet}
              title="Add a set"
              description="Search a set name or number, or upload a photo of the set."
              wide
            >
              <div className="search-row">
                <label className="kit-search">
                  <Search size={19} />
                  <input
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    placeholder="Search set name or number"
                    aria-label="Search set name or number"
                  />
                </label>
                <button
                  type="button"
                  className="kit-button kit-button-outline"
                  onClick={() => setFileRef.current?.click()}
                >
                  <ImagePlus size={17} /> Upload image
                </button>
                <input
                  ref={setFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onSetPhoto(file);
                  }}
                />
              </div>
              {setPhoto && (
                <div className="photo-match">
                  <img src={setPhoto} alt="Uploaded set" />
                  <div>
                    {photoBusy ? (
                      <p>Looking through the catalogue…</p>
                    ) : photoSets.length ? (
                      <>
                        <p>Closest sets from this photo</p>
                        <div className="idea-grid set-grid add-set-catalog">
                          {photoSets.map((set) => (
                            <SetCard key={set.id} set={set} box={box} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p>{photoNote}</p>
                    )}
                  </div>
                </div>
              )}
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
                      <div className="creation-copy">
                        <h3>{model.name}</h3>
                        <div className="idea-meta creation-meta">
                          <span>
                            {creation.keepBuilt
                              ? "Its pieces are saved for this creation."
                              : "Its pieces can become something new."}
                          </span>
                        </div>
                        {!canKeep && !creation.keepBuilt && (
                          <small className="creation-meta-note">
                            Some pieces are being used in another build.
                          </small>
                        )}
                      </div>
                      <div className="creation-actions">
                        <button
                          type="button"
                          className={`kit-icon-button creation-lock ${creation.keepBuilt ? "is-locked" : ""}`}
                          aria-pressed={creation.keepBuilt}
                          aria-label={
                            creation.keepBuilt
                              ? `Unlock ${model.name} to free its pieces`
                              : `Lock ${model.name} to reserve its pieces`
                          }
                          title={
                            !canKeep && !creation.keepBuilt
                              ? "Some pieces are being used in another build."
                              : creation.keepBuilt
                                ? "Locked — pieces reserved, can't remove"
                                : "Unlocked — pieces can be reused"
                          }
                          disabled={!canKeep && !creation.keepBuilt}
                          onClick={() => box.toggleCreation(creation.id)}
                        >
                          {creation.keepBuilt ? (
                            <LockKeyhole size={18} />
                          ) : (
                            <UnlockKeyhole size={18} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="kit-icon-button creation-remove"
                          aria-label={`Remove ${model.name}`}
                          title={
                            creation.keepBuilt
                              ? "Unlock this creation before removing it"
                              : undefined
                          }
                          disabled={creation.keepBuilt}
                          onClick={() => box.removeCreation(creation.id)}
                        >
                          <X size={18} />
                        </button>
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
        {tab === "saved" && (
          <>
            {box.collection.wishlist.length ? (
              <div className="idea-grid">
                {box.collection.wishlist.map((id) => {
                  const model = modelById[id];
                  if (!model) return null;
                  return (
                    <IdeaCard
                      key={model.id}
                      model={model}
                      match={matchInventory(model.inventory, available)}
                      saved
                      onOpen={() => onOpenModel?.(model)}
                      onSave={() => box.toggleWish(model.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="kit-empty">
                <Heart size={38} />
                <h3>Saved ideas will live here</h3>
                <p>Tap the heart on a build to keep it in your box.</p>
              </div>
            )}
          </>
        )}
        <button
          type="button"
          className="kit-text-button box-refresh"
          onClick={() => window.location.reload()}
        >
          <RotateCcw size={15} /> Refresh
        </button>
      </div>
      <KitDialog
        open={scanning}
        onClose={closeScan}
        title="Scan pieces"
        description="Upload a photo of loose pieces. We’ll guess what’s there before adding them."
        wide
      >
        <div
          className="scan-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) void onPiecePhoto(file);
          }}
        >
          {scanPhoto ? (
            <img src={scanPhoto} alt="Uploaded pieces" />
          ) : (
            <p>Drop a photo here, or use Scan pieces again.</p>
          )}
          <button
            type="button"
            className="kit-button kit-button-outline"
            onClick={() => pieceFileRef.current?.click()}
          >
            <ImagePlus size={17} /> Upload image
          </button>
        </div>
        {scanBusy && <p className="scan-note">Looking at the colours…</p>}
        {!scanBusy && scanNote && <p className="scan-note">{scanNote}</p>}
        {!scanBusy && guessGroups.length > 0 && (
          <div className="scan-review">
            {guessGroups.map((group) => (
              <section key={group.color}>
                <h3>{group.color}</h3>
                {group.items.map((guess) => {
                  const part = partByKey[guess.key];
                  if (!part) return null;
                  return (
                    <article key={guess.key}>
                      <img
                        src={
                          part.image ??
                          `/demo/parts/${part.key.replace(":", "-")}.svg`
                        }
                        alt=""
                      />
                      <div>
                        <strong>{part.name}</strong>
                        <span>{part.colorName}</span>
                      </div>
                      <Counter
                        value={guess.quantity}
                        name={`${part.colorName} ${part.name}`}
                        onDecrease={() =>
                          setGuesses((current) =>
                            current.map((item) =>
                              item.key === guess.key
                                ? {
                                    ...item,
                                    quantity: Math.max(0, item.quantity - 1),
                                  }
                                : item,
                            ),
                          )
                        }
                        onIncrease={() =>
                          setGuesses((current) =>
                            current.map((item) =>
                              item.key === guess.key
                                ? {
                                    ...item,
                                    quantity: Math.min(12, item.quantity + 1),
                                  }
                                : item,
                            ),
                          )
                        }
                        max={12}
                      />
                    </article>
                  );
                })}
              </section>
            ))}
            <button
              type="button"
              className="kit-button kit-button-dark"
              disabled={!guesses.some((guess) => guess.quantity > 0)}
              onClick={() => {
                for (const guess of guesses) {
                  if (guess.quantity > 0)
                    box.adjustLoose(guess.key, guess.quantity);
                }
                closeScan();
              }}
            >
              Add these <Check size={17} />
            </button>
          </div>
        )}
      </KitDialog>
      {onDone && (
        <div className="box-footer">
          <button className="kit-button kit-button-dark" onClick={onDone}>
            Done <Check size={17} />
          </button>
        </div>
      )}
      </>
      )}
      {box.storageError && (
        <p role="status" className="kit-storage-note">
          This browser couldn’t save your box. Keep this tab open to keep your
          changes.
        </p>
      )}
    </div>
  );
}
