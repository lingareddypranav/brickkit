"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Check,
  Search,
  Sparkles,
} from "lucide-react";
import { useBrickBox } from "@/hooks/use-brick-box";
import { useBuildIdeas } from "@/hooks/use-build-ideas";
import { buildAssistantReply, type ChatChoice } from "@/lib/demo/chat-script";
import { modelById } from "@/lib/demo/catalog";
import { matchInventory } from "@/lib/demo/inventory";
import { hasPictureInstructions } from "@/lib/demo/instructions";
import type { Blueprint } from "@/lib/demo/types";
import { BrickBoxPanel, type BoxTab } from "./brick-box";
import { IdeaCard } from "./idea-card";
import { BuildGuide } from "./build-guide";
import { BuildDetail } from "./build-detail";
import "./prototype.css";
import "./gallery.css";
import "./guide.css";

type Pane = "make" | "box";
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
  const [needed, setNeeded] = useState<Blueprint | null>(null);
  const [chatting, setChatting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<number | null>(null);
  const messageId = useRef(0);
  const ownedSets = Object.values(box.collection.sets).reduce(
    (s, x) => s + x.quantity,
    0,
  );
  function openBox(tab: BoxTab = "sets") {
    setNeeded(null);
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
          <a href="/landing/index.html#credits">
            About Blueprint <ArrowRight size={14} />
          </a>
        </nav>
        <div className="kit-sidebar-filters">
          <button
            type="button"
            className={`kit-sidebar-switch bricks-switch ${ideas.onlyInstructions ? "is-on" : ""}`}
            role="switch"
            aria-checked={ideas.onlyInstructions}
            onClick={() => ideas.setOnlyInstructions(!ideas.onlyInstructions)}
          >
            Instruction ready
            <span className="switch-track" aria-hidden="true">
              <span>{ideas.onlyInstructions && <Check size={11} />}</span>
            </span>
          </button>
          <button
            type="button"
            className={`kit-sidebar-switch bricks-switch ${ideas.onlyMyBricks ? "is-on" : ""}`}
            role="switch"
            aria-checked={ideas.onlyMyBricks}
            onClick={() => ideas.setOnlyMyBricks(!ideas.onlyMyBricks)}
          >
            Use my bricks
            <span className="switch-track" aria-hidden="true">
              <span>{ideas.onlyMyBricks && <Check size={11} />}</span>
            </span>
          </button>
        </div>
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
                      <div
                        className="chat-choices"
                        role="group"
                        aria-label="Choose an answer"
                      >
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
                      <div
                        className="chat-results"
                        aria-label="Blueprint ideas"
                      >
                        {ideas.onlyInstructions &&
                          !message.results.some((id) =>
                            hasPictureInstructions(id),
                          ) && (
                            <div className="gallery-empty">
                              <p>
                                None of these ideas have picture instructions
                                yet.
                              </p>
                              <button
                                className="kit-button kit-button-outline"
                                onClick={() =>
                                  ideas.setOnlyInstructions(false)
                                }
                              >
                                Show all ideas
                              </button>
                            </div>
                          )}
                        {ideas.onlyMyBricks &&
                          !message.results.some(
                            (id) =>
                              modelById[id] &&
                              matchInventory(
                                modelById[id].inventory,
                                ideas.available,
                              ).ready,
                          ) && (
                            <div className="gallery-empty">
                              <p>
                                Your box needs a few more pieces for these
                                builds.
                              </p>
                              <button
                                className="kit-button kit-button-outline"
                                onClick={() => ideas.setOnlyMyBricks(false)}
                              >
                                Show ideas that need more pieces
                              </button>
                            </div>
                          )}
                        {message.results
                          .filter((id) => {
                            if (
                              ideas.onlyInstructions &&
                              !hasPictureInstructions(id)
                            )
                              return false;
                            if (
                              ideas.onlyMyBricks &&
                              !(
                                modelById[id] &&
                                matchInventory(
                                  modelById[id].inventory,
                                  ideas.available,
                                ).ready
                              )
                            )
                              return false;
                            return true;
                          })
                          .map((modelId) => {
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
                                saved={box.collection.wishlist.includes(
                                  model.id,
                                )}
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
              <Search size={18} strokeWidth={1.75} aria-hidden />
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
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </button>
            </form>

            <div
              className="make-below"
              inert={chatting || undefined}
              aria-hidden={chatting}
            >
              <div className="make-below-inner">
                <div className="prompt-feedback-slot" role="status" aria-live="polite">
                  {ideas.promptMessage ? (
                    <p className="prompt-feedback">{ideas.promptMessage}</p>
                  ) : null}
                </div>
                <div className="make-samples">
                  <div className="make-samples-scroll">
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
                        <h3>Let’s find your next adventure</h3>
                        {ideas.onlyInstructions ? (
                          <>
                            <p>
                              None of these ideas have picture instructions
                              yet.
                            </p>
                            <button
                              className="kit-button kit-button-outline"
                              onClick={() =>
                                ideas.setOnlyInstructions(false)
                              }
                            >
                              Show all ideas
                            </button>
                          </>
                        ) : (
                          <>
                            <p>
                              Your box doesn’t have all the pieces for these
                              ideas yet. Add your sets, or explore something
                              new.
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
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
              onOpenModel={setSelected}
              needed={needed}
              onClearNeeded={() => setNeeded(null)}
            />
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
          onFindPieces={() => {
            setNeeded(selected);
            setSelected(null);
            setPane("box");
          }}
          onManageBox={(tab) => {
            setSelected(null);
            openBox(tab);
          }}
        />
      )}
      {building && (
        <BuildGuide
          key={building.id}
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
