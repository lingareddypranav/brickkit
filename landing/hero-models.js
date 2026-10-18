import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const LIBRARY = "./ldraw/";
const FADE_MS = 320;

const MODELS = [
  { name: "Blue Racer", url: "./models/blue-racer.mpd" },
  {
    name: "Space Shuttle Explorer",
    url: "./models/shuttle-explorer.mpd",
    shuttle: true,
  },
  { name: "Dinosaur", url: "./models/green-dinosaur.mpd" },
];

const stage = document.querySelector("[data-prompt-stage]");
const canvas = document.querySelector("[data-hero-canvas]");
if (!stage || !canvas) throw new Error("hero stage missing");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(5.4, 3.4, 6.6);
camera.lookAt(0, -0.7, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.7));
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(6, 10, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1.15);
fill.position.set(-5, 3, -4);
scene.add(fill);

const pivot = new THREE.Group();
scene.add(pivot);

const loader = new LDrawLoader();
loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
loader.setPartsLibraryPath(LIBRARY);

const cache = new Array(MODELS.length);
const loading = new Array(MODELS.length);
let shown = -1;
let wanted = typeof window.__lpModel === "number" ? window.__lpModel : 0;
let spin = 0;

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  pivot.traverse((object) => {
    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];
    for (const material of materials) {
      if (material.isLDrawConditionalLineMaterial) {
        material.resolution.set(width, height);
      }
    }
  });
}

function frame(group) {
  group.rotation.x = Math.PI;
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  group.position.sub(bounds.getCenter(new THREE.Vector3()));
  const framed = new THREE.Group();
  framed.add(group);
  framed.scale.setScalar(4.75 / Math.max(size.x, size.y, size.z, 1));
  return framed;
}

function shuttleFirst(text) {
  const chunks = text.split(/\n(?=0 FILE )/);
  const shuttle = chunks.find((chunk) =>
    chunk.startsWith("0 FILE 31066 - shuttle.ldr"),
  );
  if (!shuttle) return text;
  return [shuttle, ...chunks.filter((chunk) => chunk !== shuttle)].join("\n");
}

let parseChain = Promise.resolve();

function parse(text) {
  const run = parseChain.then(
    () =>
      new Promise((resolve, reject) => {
        loader.parse(text, resolve, reject);
      }),
  );
  parseChain = run.catch(() => {});
  return run;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function load(index) {
  if (cache[index]) return Promise.resolve(cache[index]);
  if (loading[index]) return loading[index];
  const model = MODELS[index];
  loading[index] = fetch(model.url)
    .then((response) => {
      if (!response.ok) throw new Error(model.url + " " + response.status);
      return response.text();
    })
    .then((text) => parse(model.shuttle ? shuttleFirst(text) : text))
    .then((group) => {
      cache[index] = frame(group);
      return cache[index];
    });
  return loading[index];
}

function place(index) {
  const group = cache[index];
  if (!group) return;
  while (pivot.children.length) pivot.remove(pivot.children[0]);
  pivot.add(group);
  pivot.rotation.y = spin;
  shown = index;
  canvas.setAttribute("aria-label", "3D LEGO model, " + MODELS[index].name);
  stage.classList.add("is-ready");
  resize();
}

let revealToken = 0;

async function reveal(index, fade) {
  const mine = ++revealToken;
  wanted = index;
  try {
    await load(index);
  } catch (error) {
    console.warn("LEGO model could not load", MODELS[index].name, error);
    return;
  }
  if (mine !== revealToken) return;
  const crossfade = fade && !reduced && shown >= 0;
  try {
    if (crossfade) {
      canvas.style.opacity = "0";
      await wait(FADE_MS);
    }
    if (mine !== revealToken) return;
    place(index);
  } finally {
    if (mine === revealToken) canvas.style.opacity = "1";
  }
}

document.addEventListener("lp-prompt", (event) => {
  const detail = event.detail || {};
  const index = typeof detail.index === "number" ? detail.index : detail;
  reveal(index, !!detail.fade).finally(() => {
    if (typeof detail.done === "function") detail.done();
  });
});

function tick() {
  if (!reduced && shown >= 0) {
    spin += 0.0026;
    pivot.rotation.y = spin;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

resize();
new ResizeObserver(resize).observe(stage);
requestAnimationFrame(tick);

await loader.preloadMaterials(LIBRARY + "LDConfig.ldr");
await reveal(wanted, false);
for (let i = 0; i < MODELS.length; i++) {
  if (i !== wanted) await load(i).catch(() => {});
}
