import { families, findFamily, modelById, models } from "./catalog";
import type { Family } from "./types";

export type ChatChoice = {
  id: string;
  label: string;
  family?: Exclude<Family, "all">;
  models?: string[];
};
export type AssistantReply = {
  text: string;
  choices?: ChatChoice[];
  results?: string[];
};

const FAMILY_CHOICES: ChatChoice[] = families
  .filter((f) => f.id !== "all")
  .map((f) => ({
    id: `family-${f.id}`,
    label: f.label,
    family: f.id as Exclude<Family, "all">,
  }));
const QUESTIONS: Record<Exclude<Family, "all">, string> = {
  dragons:
    "A dragon adventure! Would you like a dragon friend or a whole castle wagon?",
  dinosaurs: "Let’s go back in time. Who should stomp into the story?",
  space: "Outer space it is! Which mission sounds fun?",
  animals: "An animal friend! Who should we build?",
  rides: "Something that goes! Pick your next ride.",
};

/** Choices come from the catalogue, so new OMR imports never leave stale recipe IDs. */
export function buildAssistantReply(
  text: string,
  choice: ChatChoice | undefined,
  history: { role: "user" | "assistant"; choices?: ChatChoice[] }[],
): AssistantReply {
  const last = [...history].reverse().find((m) => m.role === "assistant");
  const needle = text.trim().toLowerCase();
  const picked =
    choice ?? last?.choices?.find((c) => c.label.toLowerCase() === needle);
  const exact = models.find((m) => m.name.toLowerCase() === needle);
  if (picked?.models?.length || exact) {
    const results = (picked?.models ?? [exact!.id]).filter(
      (id) => !!modelById[id],
    );
    return {
      text: "Here are the blueprints I made for you. The badge shows which ones fit your brick box. Tap one to take a closer look.",
      results,
      choices: FAMILY_CHOICES,
    };
  }
  const family = picked?.family ?? findFamily(text);
  if (family && family !== "all") {
    const options = models.filter((m) => m.family === family);
    return {
      text: QUESTIONS[family],
      choices: [
        ...options
          .slice(0, 3)
          .map((m) => ({ id: `build-${m.id}`, label: m.name, models: [m.id] })),
        {
          id: `all-${family}`,
          label: "Show me all of them",
          models: options.map((m) => m.id),
        },
      ],
    };
  }
  return {
    text: "Pick a kind of adventure and I’ll find a build for you.",
    choices: FAMILY_CHOICES,
  };
}
