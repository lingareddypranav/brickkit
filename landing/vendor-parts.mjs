import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname);
const out = path.join(root, "ldraw");
const base =
  "https://cdn.jsdelivr.net/gh/gkjohnson/ldraw-parts-library@master/complete/ldraw/";
const models = [
  path.join(root, "../product/brick-linkfrontend/public/demo/omr/blue-racer.mpd"),
  path.join(root, "../product/brick-linkfrontend/public/demo/omr/shuttle-explorer.mpd"),
  path.join(root, "../product/brick-linkfrontend/public/demo/omr/green-dinosaur.mpd"),
];

function embeddedNames(text) {
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("0 FILE ")) names.add(line.slice(7).trim());
  }
  return names;
}

function references(text) {
  const files = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("1 ")) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 15) continue;
    files.push(tokens.slice(14).join(" ").replace(/\\/g, "/"));
  }
  return files;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.text();
}

const saved = new Map();
const seen = new Set();
const queue = [];
let active = 0;
let finished;

function candidates(file) {
  const lower = file.toLowerCase();
  const names = file === lower ? [file] : [file, lower];
  const paths = [];
  for (const name of names) {
    paths.push("parts/" + name, "p/" + name, "models/" + name);
  }
  return paths;
}

async function savePart(file) {
  const key = file.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  for (const rel of candidates(file)) {
    if (saved.has(rel.toLowerCase())) return;
    const text = await fetchText(base + rel);
    if (text == null) continue;
    const dest = path.join(out, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, text);
    saved.set(rel.toLowerCase(), true);
    for (const next of references(text)) enqueue(next);
    return;
  }
  console.warn("missing", file);
}

function pump() {
  while (active < 12 && queue.length) {
    const file = queue.shift();
    active += 1;
    savePart(file).finally(() => {
      active -= 1;
      if (active === 0 && queue.length === 0) finished();
      else pump();
    });
  }
}

function enqueue(file) {
  queue.push(file);
  if (finished) pump();
}

const config = await fetchText(base + "LDConfig.ldr");
if (!config) throw new Error("LDConfig.ldr missing");
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "LDConfig.ldr"), config);

const initial = [];
for (const model of models) {
  const text = await readFile(model, "utf8");
  const embedded = embeddedNames(text);
  for (const file of references(text)) {
    if (!embedded.has(file)) initial.push(file);
  }
}

await new Promise((resolve) => {
  finished = resolve;
  for (const file of initial) queue.push(file);
  if (queue.length === 0) resolve();
  else pump();
});
console.log("saved", saved.size, "parts");
