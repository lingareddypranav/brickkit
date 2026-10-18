"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
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
import {
  buildAssistantReply,
  type ChatChoice,
} from "@/lib/demo/chat-script";
import { families, modelById } from "@/lib/demo/catalog";
import { countPieces, matchInventory } from "@/lib/demo/inventory";
import type { Blueprint } from "@/lib/demo/types";
import { BrickBoxPanel } from "./brick-box";
import { IdeaCard } from "./idea-card";
import { BuildGuide } from "./build-guide";
import { BuildDetail } from "./build-detail";
import "./prototype.css";
import "./gallery.css";
import "./guide.css";

type Pane = "make" | "box" | "hero";
type BoxTab = "sets" | "pieces" | "made";
type ChatRole = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  choices?: ChatChoice[];
  choiceTaken?: string;
  results?: string[];
};

export default function BrickStudio() {
  const box = useBrickBox();
  const ideas = useBuildIdeas(box.collection);
  const [pane, setPane] = useState<Pane>("make");
  const [boxTab, setBoxTab] = useState<BoxTab>("sets");
  const [building, setBuilding] = useState<Blueprint | null>(null);
  const [selected, setSelected] = useState<Blueprint | null>(null);
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const messageId = useRef(0);
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

  function nextMessageId() {
    messageId.current += 1;
    return `chat-${messageId.current}`;
  }

  function enterChat() {
    setChatting(true);
  }

  function exitChat() {
    if (replyTimer.current) {
      window.clearTimeout(replyTimer.current);
      replyTimer.current = null;
    }
    setChatting(false);
    setMessages([]);
    setPending(false);
    ideas.setPrompt("");
  }

  function sendChat(text = ideas.prompt.trim(), choice?: ChatChoice) {
    if (!text || pending) return;
    enterChat();
    ideas.setPrompt("");
    setMessages((current) => [
      ...current,
      { id: nextMessageId(), role: "user", text },
    ]);
    setPending(true);
    replyTimer.current = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "assistant",
          ...buildAssistantReply(text, choice, current),
        },
      ]);
      setPending(false);
      replyTimer.current = null;
    }, 550);
  }

  function pickChoice(messageId: string, choice: ChatChoice) {
    if (pending) return;
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, choiceTaken: choice.id }
          : message,
      ),
    );
    sendChat(choice.label, choice);
  }

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread || !chatting) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages, pending, chatting]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
    };
  }, []);

  return (
    <div className="kit-app">
      <aside className="kit-sidebar">
        <a
          className="bp-lockup bp-lockup--xs bp-lockup--on-light kit-sidebar-brand"
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
          <section
            className={`make-pane${chatting ? " is-chatting" : ""}`}
            aria-labelledby="ideas-heading"
          >
            <button
              type="button"
              className="chat-back"
              onClick={exitChat}
              tabIndex={chatting ? 0 : -1}
              aria-hidden={!chatting}
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div
              className="make-above"
              inert={chatting || undefined}
              aria-hidden={chatting}
            >
              <h1 className="make-title" id="ideas-heading">
                Hi Timmy! What shall we build?
              </h1>
            </div>

            <div
              className="chat-thread"
              aria-live="polite"
              aria-hidden={!chatting}
              inert={!chatting || undefined}
              ref={threadRef}
            >
              <div className="chat-thread-inner">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-turn chat-turn--${message.role}`}
                  >
                    <div className={`chat-msg chat-msg--${message.role}`}>
                      <p>{message.text}</p>
                    </div>
                    {message.choices && message.choices.length > 0 && (
                      <div className="chat-choices" role="group" aria-label="Choose an answer">
                        {message.choices.map((choice) => (
                          <button
                            key={choice.id}
                            type="button"
                            disabled={pending || Boolean(message.choiceTaken)}
                            aria-pressed={message.choiceTaken === choice.id}
                            onClick={() => pickChoice(message.id, choice)}
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.results && message.results.length > 0 && (
                      <div className="chat-results" aria-label="Blueprint ideas">
                        {message.results.map((modelId) => {
                          const model = modelById[modelId];
                          if (!model) return null;
                          return (
                            <IdeaCard
                              key={model.id}
                              model={model}
                              match={matchInventory(
                                model.inventory,
                                ideas.available,
                              )}
                              saved={box.collection.wishlist.includes(model.id)}
                              onOpen={() => setSelected(model)}
                              onSave={() => box.toggleWish(model.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {pending && (
                  <div
                    className="chat-msg chat-msg--assistant chat-pending"
                    aria-label="Blueprint is thinking"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>

            <form
              className="idea-prompt"
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
            >
              <Search size={18} />
              <input
                aria-label="What would you like to build?"
                placeholder={
                  chatting
                    ? "Ask Blueprint anything…"
                    : "A dragon? A spaceship? Tell Blueprint your idea…"
                }
                value={ideas.prompt}
                onChange={(e) => ideas.setPrompt(e.target.value)}
              />
              <button type="submit" aria-label="Send idea">
                <ArrowRight size={20} />
              </button>
            </form>

            <div
              className="make-below"
              inert={chatting || undefined}
              aria-hidden={chatting}
            >
              <div className="make-below-inner">
                <div
                  className="family-choices"
                  aria-label="Choose a kind of build"
                >
                  {families.map((family) => (
                    <button
                      key={family.id}
                      aria-pressed={ideas.family === family.id}
                      onClick={() => {
                        ideas.setFamily(family.id);
                        ideas.setSavedOnly(false);
                      }}
                    >
                      <span
                        style={{
                          background:
                            family.background ??
                            modelById[family.model].background,
                        }}
                      >
                        <img
                          src={family.image ?? modelById[family.model].image}
                          alt=""
                        />
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
                    onClick={() => ideas.setSavedOnly(!ideas.savedOnly)}
                  >
                    <Heart
                      size={16}
                      fill={ideas.savedOnly ? "currentColor" : "none"}
                    />{" "}
                    Saved <span>{box.collection.wishlist.length}</span>
                  </button>
                </div>
                {ideas.promptMessage && (
                  <p className="prompt-feedback" role="status">
                    {ideas.promptMessage}
                  </p>
                )}
                <div className="kit-pane-scroll make-samples">
                  {ideas.ideas.length ? (
                    <div
                      className="idea-carousel"
                      aria-busy={!box.hydrated}
                      aria-label="Build ideas"
                    >
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
              </div>
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
