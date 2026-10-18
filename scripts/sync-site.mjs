import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "product/brick-linkfrontend/public");

// These folders are generated. Edit their originals at the workspace root.
for (const [folder, entries] of [
  ["design-system", ["index.html", "styles", "assets", "js", "tokens"]],
  ["landing", ["index.html", "landing.css", "hero.js", "hero-models.js", "models", "ldraw"]],
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
console.log("Prepared landing page and design system for the product server.");
