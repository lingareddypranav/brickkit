import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "product/brick-linkfrontend/public");

// These folders are generated. Edit their originals at the workspace root.
for (const [folder, entries] of [
  ["design-system", ["index.html", "styles", "assets", "js", "tokens"]],
  ["landing", ["index.html", "landing.css", "hero.js", "hero-models.js", "models", "ldraw"]],
  ["landing-v2", ["index.html", "landing-v2.css", "space.js", "ship.js"]],
]) {
  const destination = path.join(publicDir, folder);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const entry of entries) {
    await cp(path.join(root, folder, entry), path.join(destination, entry), {
      recursive: true,
    });
  }
}

const landingShared = ["models", "ldraw"];
const landingV2Public = path.join(publicDir, "landing-v2");
for (const entry of landingShared) {
  await cp(path.join(root, "landing", entry), path.join(landingV2Public, entry), {
    recursive: true,
  });
}
console.log("Prepared landing page and design system for the product server.");
