"use client";
import { useState } from "react";
import {
  ArrowRight,
  Blocks,
  Check,
  Heart,
  LockKeyhole,
  Search,
  Sparkles,
} from "lucide-react";
import { useBrickBox } from "@/hooks/use-brick-box";
import { useBuildIdeas } from "@/hooks/use-build-ideas";
import { families, modelById } from "@/lib/demo/catalog";
import { countPieces } from "@/lib/demo/inventory";
import type { Blueprint } from "@/lib/demo/types";
import { BrickBoxPanel } from "./brick-box";
import { IdeaCard } from "./idea-card";
import { BuildGuide } from "./build-guide";
import { BuildDetail } from "./build-detail";
import "./prototype.css";
import "./gallery.css";
import "./guide.css";

type Pane = "make" | "samples" | "box" | "hero";
type BoxTab = "sets" | "pieces" | "made";

export default function BrickStudio() {
  const box = useBrickBox();
  const ideas = useBuildIdeas(box.collection);
  const [pane, setPane] = useState<Pane>("make");
  const [boxTab, setBoxTab] = useState<BoxTab>("sets");
  const [building, setBuilding] = useState<Blueprint | null>(null);
  const [selected, setSelected] = useState<Blueprint | null>(null);
  const ownedSets = Object.values(box.collection.sets).reduce(
    (s, x) => s + x.quantity,
    0,
  );
  const protectedCount =
    Object.values(box.collection.sets).filter((set) => set.keepBuilt).length +
    box.collection.creations.filter((model) => model.keepBuilt).length;

  function openBox(tab: BoxTab = "sets") {
    setBoxTab(tab);
    setPane("box");
  }

  function goSamples() {
    setPane("samples");
  }

  return (
    <div className="kit-app">
      <aside className="kit-sidebar">
        <a
          className="bp-lockup bp-lockup--sm bp-lockup--on-light kit-sidebar-brand"
          href="/"
          aria-label="Blueprint home"
        >
          <span className="bp-mark" aria-hidden="true" />
          <span className="bp-wordmark">Blueprint</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={pane === "make" ? "is-active" : ""}
            aria-current={pane === "make" ? "page" : undefined}
            onClick={() => setPane("make")}
          >
            Build
          </button>
          <button
            className={pane === "samples" ? "is-active" : ""}
            aria-current={pane === "samples" ? "page" : undefined}
            onClick={() => setPane("samples")}
          >
            Samples
          </button>
          <button
            className={pane === "box" ? "is-active" : ""}
            aria-current={pane === "box" ? "page" : undefined}
            onClick={() => openBox(boxTab)}
          >
            My brick box
            <span>{ownedSets}</span>
          </button>
          <button
            className={pane === "hero" ? "is-active" : ""}
            aria-current={pane === "hero" ? "page" : undefined}
            onClick={() => setPane("hero")}
          >
            Hero
            <em>demo</em>
          </button>
        </nav>
      </aside>

      <main className="kit-pane">
        {pane === "make" && (
          <section className="make-pane" aria-labelledby="ideas-heading">
            <div className="make-pane-inner">
              <h1 className="make-title" id="ideas-heading">
                What shall we build?
              </h1>
              <form
                className="idea-prompt"
                onSubmit={(e) => {
                  e.preventDefault();
                  ideas.submitPrompt();
                  goSamples();
                }}
              >
                <Search size={18} />
                <input
                  aria-label="What would you like to build?"
                  placeholder="A dragon? A spaceship? Tell Blueprint your idea…"
                  value={ideas.prompt}
                  onChange={(e) => ideas.setPrompt(e.target.value)}
                />
                <button type="submit" aria-label="Find an idea">
                  <ArrowRight size={20} />
                </button>
              </form>
              <div className="family-choices" aria-label="Choose a kind of build">
                {families.map((family) => (
                  <button
                    key={family.id}
                    aria-pressed={ideas.family === family.id}
                    onClick={() => {
                      ideas.setFamily(family.id);
                      ideas.setSavedOnly(false);
                      goSamples();
                    }}
                  >
                    <span
                      style={{ background: modelById[family.model].background }}
                    >
                      <img src={modelById[family.model].image} alt="" />
                    </span>
                    {family.label}
                  </button>
                ))}
              </div>
              <div className="idea-controls">
                <button
                  className={`bricks-switch ${ideas.onlyMyBricks ? "is-on" : ""}`}
                  role="switch"
                  aria-checked={ideas.onlyMyBricks}
                  onClick={() => ideas.setOnlyMyBricks(!ideas.onlyMyBricks)}
                >
                  <span className="switch-track">
                    <span>{ideas.onlyMyBricks && <Check size={11} />}</span>
                  </span>
                  <span>Use my bricks</span>
                </button>
                <button
                  className={`saved-filter ${ideas.savedOnly ? "is-active" : ""}`}
                  aria-pressed={ideas.savedOnly}
                  onClick={() => {
                    ideas.setSavedOnly(!ideas.savedOnly);
                    goSamples();
                  }}
                >
                  <Heart
                    size={16}
                    fill={ideas.savedOnly ? "currentColor" : "none"}
                  />{" "}
                  Saved <span>{box.collection.wishlist.length}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {pane === "samples" && (
          <section className="samples-pane" aria-labelledby="samples-heading">
            <div className="pane-toolbar">
              <div>
                <span className="section-kicker">SAMPLES</span>
                <h2 id="samples-heading">Little ideas to try</h2>
              </div>
              <p className="results-count" aria-live="polite">
                {box.hydrated
                  ? `${ideas.ideas.length} little ${ideas.ideas.length === 1 ? "idea" : "ideas"}${ideas.onlyMyBricks ? " ready to make" : " to explore"}`
                  : "Finding your next adventure…"}
              </p>
            </div>
            {ideas.promptMessage && (
              <p className="prompt-feedback" role="status">
                {ideas.promptMessage}
              </p>
            )}
            <div className="kit-pane-scroll">
              {ideas.ideas.length ? (
                <div className="idea-grid" aria-busy={!box.hydrated}>
                  {ideas.ideas.map((idea) => (
                    <IdeaCard
                      key={idea.model.id}
                      {...idea}
                      onOpen={() => setSelected(idea.model)}
                      onSave={() => box.toggleWish(idea.model.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="gallery-empty">
                  <Blocks size={38} />
                  <h3>
                    {ideas.savedOnly
                      ? "A little room for dreams"
                      : "Let’s find your next adventure"}
                  </h3>
                  <p>
                    {ideas.savedOnly
                      ? "Tap a heart to save an idea. You can include ideas that need more pieces, too."
                      : "Your box doesn’t have all the pieces for these ideas yet. Add your sets, or explore something new."}
                  </p>
                  <div>
                    <button
                      className="kit-button kit-button-light"
                      onClick={() => openBox("sets")}
                    >
                      Open my brick box
                    </button>
                    <button
                      className="kit-button kit-button-outline"
                      onClick={() => ideas.setOnlyMyBricks(false)}
                    >
                      Show more ideas <Sparkles size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {pane === "box" && (
          <section className="box-dock" aria-labelledby="box-heading">
            <BrickBoxPanel
              box={box}
              initialTab={boxTab}
              docked
              onTabChange={setBoxTab}
            />
          </section>
        )}

        {pane === "hero" && (
          <section className="hero-pane kit-pane-scroll">
            <div className="studio-hero">
              <div>
                <p className="hero-kicker">
                  <span /> A little imagination goes a long way
                </p>
                <h1>
                  Big ideas.
                  <br />
                  <span>Already in your box.</span>
                </h1>
                <p className="hero-description">
                  Turn the bricks you have into something
                  <br className="desktop-break" /> you haven’t imagined yet.
                </p>
                <button
                  className="hero-box-link"
                  onClick={() => openBox("sets")}
                >
                  Take a peek in my brick box <ArrowRight size={18} />
                </button>
              </div>
              <div className="hero-world" aria-hidden="true">
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
                <span className="hero-star star-one">✦</span>
                <img
                  src="/demo/models/star-skimmer.svg"
                  className="hero-rocket"
                  alt=""
                />
                <span className="hero-star star-two">✦</span>
                <span className="hero-caption">
                  a box full of
                  <br />
                  what ifs.
                </span>
              </div>
            </div>
            <div className="collection-strip">
              <div className="strip-icon">
                <Blocks size={22} />
              </div>
              <div>
                <strong>Your next adventure starts here.</strong>
                <p>
                  {box.hydrated ? (
                    <>
                      {ideas.readyCount} mini builds ready ·{" "}
                      {countPieces(ideas.available)} pieces to play with
                      {protectedCount > 0 && (
                        <span className="protected-summary">
                          {" "}
                          · <LockKeyhole size={12} /> {protectedCount} kept
                          built
                        </span>
                      )}
                    </>
                  ) : (
                    "Opening your brick box…"
                  )}
                </p>
              </div>
              <button
                className="kit-text-button"
                onClick={() => openBox("sets")}
              >
                Edit my box <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}
      </main>

      {selected && (
        <BuildDetail
          onBuild={() => {
            setBuilding(selected);
            setSelected(null);
          }}
          model={selected}
          box={box}
          onClose={() => setSelected(null)}
          onManageBox={(tab) => {
            setSelected(null);
            openBox(tab);
          }}
        />
      )}
      {building && (
        <BuildGuide
          model={building}
          box={box}
          onClose={() => setBuilding(null)}
          onShelf={() => {
            setBuilding(null);
            openBox("made");
          }}
        />
      )}
    </div>
  );
}
