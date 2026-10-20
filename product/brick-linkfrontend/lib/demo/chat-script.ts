import { families, modelById, models } from "./catalog";
import { classifyPreviewRequest, previewPromptKey, previewSuggestions } from "./preview-prompts";
import type { Family } from "./types";

export type ChatChoice = {
  id: string;
  label: string;
  family?: Exclude<Family, "all">;
  models?: string[];
  action?: "explore-preview";
};
export type PreviewNotice = { title: string; detail: string };
export type AssistantReply = {
  text: string;
  choices?: ChatChoice[];
  results?: string[];
  preview?: PreviewNotice;
};
type ChatOptions = { allowedModelIds?: readonly string[] };

const FAMILY_CHOICES: ChatChoice[] = families
  .filter((f) => f.id !== "all")
  .map((f) => ({ id: `family-${f.id}`, label: f.label, family: f.id as Exclude<Family, "all"> }));
const QUESTIONS: Record<Exclude<Family, "all">, string> = {
  dragons: "A dragon adventure! Which dragon should join your story?",
  dinosaurs: "Let’s go back in time. Who should stomp into the story?",
  space: "Outer space it is! Which mission sounds fun?",
  animals: "An animal friend! Who should we build?",
  rides: "Something that goes! Pick your next ride.",
};

function modelChoice(id: string): ChatChoice {
  return { id: `build-${id}`, label: modelById[id].name, models: [id] };
}

/** Prepared replies and preview boundaries are independent of the frontend design. */
export function buildAssistantReply(
  text: string,
  choice: ChatChoice | undefined,
  history: { role: "user" | "assistant"; choices?: ChatChoice[]; results?: string[] }[],
  options: ChatOptions = {},
): AssistantReply {
  const last = [...history].reverse().find((m) => m.role === "assistant");
  const picked = choice ?? last?.choices?.find((c) => previewPromptKey(c.label) === previewPromptKey(text));
  const contextIds = last?.results?.length ? last.results : last?.choices?.flatMap(c => c.models ?? []) ?? [];
  const contextFamilies = new Set(contextIds.flatMap(id => modelById[id] ? [modelById[id].family] : []));
  const contextFamily = contextFamilies.size === 1 ? [...contextFamilies][0] : undefined;
  const request = classifyPreviewRequest(text, contextFamily);
  const ids = picked?.models ?? (request.kind === "build" ? request.modelIds : []);
  const results = ids.filter(id => models.some(model => model.id === id));
  if (results.length) {
    return {
      text: "Here are your preview blueprints. The badge shows which ones fit your brick box. Tap one to take a closer look.",
      results,
      choices: FAMILY_CHOICES,
    };
  }
  const family = picked?.family ?? (request.kind === "family" ? request.family : undefined);
  if (family) {
    const builds = models.filter(model => model.family === family);
    return {
      text: QUESTIONS[family],
      choices: [
        ...builds.slice(0, 3).map(model => modelChoice(model.id)),
        { id: `all-${family}`, label: "Show me all of them", models: builds.map(model => model.id) },
      ],
    };
  }
  if (request.kind === "outside-preview") {
    const suggestions = previewSuggestions(request.family, options.allowedModelIds);
    return {
      text: suggestions.length ? "What could we try instead?" : "Nothing matches your filters yet. Explore all ideas to see builds that may need more bricks or don’t have picture steps.",
      preview: {
        title: "You’re currently on Blueprint Preview",
        detail: "This is a little playground of ready-to-build ideas. We don’t have that exact build here yet.",
      },
      choices: suggestions.length ? suggestions.map(modelChoice) : [{
        id: "explore-preview", label: "Explore all preview ideas", action: "explore-preview",
        models: previewSuggestions(request.family),
      }],
    };
  }
  return { text: "Pick a kind of adventure and I’ll find a preview build for you.", choices: FAMILY_CHOICES };
}
