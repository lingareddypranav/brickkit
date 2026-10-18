import { ditherSolidToUrl, FIGMA_DEFAULTS } from "./dither.js";

const cream = ditherSolidToUrl("#f6f4eb", FIGMA_DEFAULTS);
const charcoal = ditherSolidToUrl("#2f2f2f", FIGMA_DEFAULTS);
const blue = ditherSolidToUrl("#3860e5", FIGMA_DEFAULTS);
const orange = ditherSolidToUrl("#f85f19", FIGMA_DEFAULTS);

const root = document.documentElement;
root.style.setProperty("--bp-texture-dither", `url("${cream}")`);
root.style.setProperty("--bp-texture-dither-inverse", `url("${charcoal}")`);
root.style.setProperty("--bp-texture-dither-brand", `url("${blue}")`);
root.style.setProperty("--bp-texture-dither-accent", `url("${orange}")`);

document.querySelectorAll("[data-dither-fill]").forEach((el) => {
  const hex = el.getAttribute("data-dither-fill");
  el.style.backgroundImage = `url("${ditherSolidToUrl(hex, FIGMA_DEFAULTS)}")`;
});
