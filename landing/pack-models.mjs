import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const root = path.resolve(import.meta.dirname);
const library = path.join(root, "ldraw");
const models = [
  "blue-racer.mpd",
  "shuttle-explorer.mpd",
  "green-dinosaur.mpd",
];

function ldrawName(file) {
  let name = file.replace(/\\/g, "/").trim();
  if (name.toLowerCase().startsWith("s/")) name = "parts/" + name;
  else if (name.toLowerCase().startsWith("48/")) name = "p/" + name;
  return name;
}

function rewriteFileHeaders(text) {
  return text.replace(/\\/g, "/").replace(/^0 FILE (.*)$/gm, (_, name) => `0 FILE ${ldrawName(name)}`);
}

function fileNames(text) {
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("0 FILE ")) names.add(line.slice(7).trim().toLowerCase());
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

function locate(file) {
  const slash = file.replace(/\\/g, "/");
  const names = [slash];
  const lower = slash.toLowerCase();
  if (lower !== slash) names.push(lower);
  for (const name of names) {
    for (const folder of ["parts", "p", "models"]) {
      const dest = path.join(library, folder, name);
      if (existsSync(dest)) return dest;
    }
  }
  return null;
}

async function pack(name) {
  const source = rewriteFileHeaders(await readFile(path.join(root, "models", name), "utf8"));
  const have = fileNames(source);
  const parts = [];
  const queue = references(source);
  const seen = new Set(have);

  while (queue.length) {
    const file = queue.shift();
    const key = ldrawName(file).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const dest = locate(file);
    if (!dest) continue;
    const text = await readFile(dest, "utf8");
    parts.push(`0 FILE ${ldrawName(file)}\n${text.trim()}\n`);
    queue.push(...references(text));
  }

  const packed = `${source.trim()}\n${parts.join("\n")}`.trim() + "\n";
  const out = path.join(root, "models", name.replace(/\.mpd$/i, ".packed.mpd"));
  await writeFile(out, packed);
  console.log(name, "embedded", parts.length, "parts", packed.length, "bytes");
}

for (const name of models) await pack(name);
