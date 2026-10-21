import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const card = document.querySelector("[data-model]");
const canvas = document.querySelector("[data-model-canvas]");
const slider = document.querySelector("[data-model-slider]");
if (!card || !canvas || !slider) throw new Error("model test missing");

const landing = new URL("../../landing/", import.meta.url);
const LIBRARY = new URL("ldraw/", landing).href;
const MODELS = [
  { name: "Racecar", url: new URL("models/blue-racer.packed.mpd", landing).href },
  {
    name: "Spaceship",
    url: new URL("models/shuttle-explorer.packed.mpd", landing).href,
    shuttle: true,
    scale: 1.5,
  },
  { name: "Dinosaur", url: new URL("models/green-dinosaur.packed.mpd", landing).href },
  { name: "Benny", url: new URL("models/blue-spaceman.packed.mpd", landing).href, scale: 1.2, fitPad: 1.15 },
];
const LIFT = 110;
const MODEL_SCALE = 3.15;
const CREAM = new THREE.Color(0xf6f4eb);
const INK = new THREE.Color(0x2f2f2f);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const view = new THREE.Vector3(1, 0.62, 1.22).normalize();

const ambient = new THREE.AmbientLight(0xffffff, 1.7);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(6, 10, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1.15);
fill.position.set(-5, 3, -4);
scene.add(fill);

const pivot = new THREE.Group();
scene.add(pivot);

const loader = new LDrawLoader(new THREE.LoadingManager());
loader.smoothNormals = false;
loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
loader.setPartsLibraryPath(LIBRARY);

let bricks = [];
let amount = 0;
let home = null;
let look = "color";

const viewControls = {
  zoom: 77,
  turn: 3,
  tilt: -2,
  x: 1,
  y: 20,
};

const FOLLOW_TURN = 18;
const FOLLOW_TILT = 20;
const FOLLOW_SMOOTH = 7;
const followMouse = {
  active: false,
  turn: 0,
  tilt: 0,
  targetTurn: 0,
  targetTilt: 0,
};
let lastFrame = performance.now();
const turnReadout = document.querySelector("[data-model-turn]")?.parentElement.querySelector("[data-readout]");
const tiltReadout = document.querySelector("[data-model-tilt]")?.parentElement.querySelector("[data-readout]");

function formatDeg(value) {
  return `${Math.round(value)}°`;
}

function syncViewReadouts() {
  const turn = viewControls.turn + (followMouse.active ? followMouse.turn : 0);
  const tilt = viewControls.tilt + (followMouse.active ? followMouse.tilt : 0);
  if (turnReadout) turnReadout.textContent = formatDeg(turn);
  if (tiltReadout) tiltReadout.textContent = formatDeg(tilt);
}

function viewAngles() {
  return {
    turn: viewControls.turn + (followMouse.active ? followMouse.turn : 0),
    tilt: viewControls.tilt + (followMouse.active ? followMouse.tilt : 0),
  };
}

function baseDistance() {
  const fit = home.fitScale || 1;
  const pad = home.fitPad || 1;
  const size = home.size.clone().multiplyScalar(1 / fit);
  const fov = (camera.fov * Math.PI) / 180;
  const half = Math.tan(fov / 2);
  const aspect = Math.max(camera.aspect, 0.2);
  return Math.max(size.y / (2 * half), size.x / (2 * half * aspect), size.z / (2 * half)) * 1.75 * pad;
}

function pose() {
  if (!home) return;
  const zoom = Math.max(40, viewControls.zoom) / 100;
  const dist = baseDistance() / zoom;
  const angles = viewAngles();
  const dir = view.clone().applyEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(angles.tilt),
      THREE.MathUtils.degToRad(angles.turn),
      0,
      "YXZ",
    ),
  );
  const span = Math.max(home.size.x, home.size.y, 1);
  const target = home.center.clone();
  const forward = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  target.addScaledVector(right, (-viewControls.x / 100) * span * 0.55);
  target.addScaledVector(up, (-viewControls.y / 100) * span * 0.55);
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.near = Math.max(0.05, dist / 80);
  camera.far = dist * 12;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  pose();
  renderer.render(scene, camera);
}

function shuttleFirst(text) {
  const chunks = text.split(/\n(?=0 FILE )/);
  const shuttle = chunks.find((chunk) =>
    chunk.startsWith("0 FILE 31066 - shuttle.ldr"),
  );
  if (!shuttle) return text;
  return [shuttle, ...chunks.filter((chunk) => chunk !== shuttle)].join("\n");
}

function prepareText(spec, text) {
  const normalized = text.replace(/\\/g, "/");
  return spec.shuttle ? shuttleFirst(normalized) : normalized;
}

function frame(group, scaleMul = 1) {
  group.rotation.x = Math.PI;
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  group.position.sub(bounds.getCenter(new THREE.Vector3()));
  const framed = new THREE.Group();
  framed.add(group);
  framed.scale.setScalar((MODEL_SCALE * scaleMul) / Math.max(size.x, size.y, size.z, 1));
  framed.updateWorldMatrix(true, true);
  const after = new THREE.Box3().setFromObject(framed);
  framed.position.y -= after.min.y;
  framed.updateWorldMatrix(true, true);
  const recentered = new THREE.Box3().setFromObject(framed);
  framed.position.x -= recentered.getCenter(new THREE.Vector3()).x;
  framed.position.y -= recentered.getCenter(new THREE.Vector3()).y;
  return framed;
}

function parse(text) {
  return new Promise((resolve, reject) => {
    loader.parse(text, resolve, (error) => {
      reject(error || new Error("Could not parse model"));
    });
  });
}

function materialsOf(object) {
  if (!object.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}

function isEdgeMaterial(material) {
  return Boolean(
    material.isLineBasicMaterial ||
      material.isLineMaterial ||
      material.isLDrawConditionalLineMaterial ||
      /line/i.test(material.type),
  );
}

function painted(material) {
  return material.userData?.isEdge !== undefined || Boolean(material.userData?.lineMat || material.userData?.colorMat);
}

function paintMaterial(material) {
  if (painted(material)) return material;
  const copy = material.clone();
  copy.transparent = true;
  copy.userData.baseOpacity = copy.opacity;
  copy.userData.isEdge = isEdgeMaterial(copy);
  if (copy.color) copy.userData.paintColor = copy.color.clone();
  if (copy.userData.isEdge) return copy;

  const line = new THREE.MeshBasicMaterial({
    color: CREAM,
    transparent: true,
    opacity: copy.opacity,
    side: copy.side ?? THREE.FrontSide,
    depthWrite: copy.depthWrite !== false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  line.userData.baseOpacity = copy.opacity;
  line.userData.isEdge = false;
  copy.userData.lineMat = line;
  line.userData.lineMat = line;
  line.userData.colorMat = copy;
  copy.userData.colorMat = copy;
  return copy;
}

function paintObject(object) {
  const list = materialsOf(object);
  if (!list.length) return list;
  if (list.every(painted)) return list;
  const clones = list.map(paintMaterial);
  object.material = Array.isArray(object.material) ? clones : clones[0];
  return clones;
}

function currentMaterials(object) {
  const list = materialsOf(object);
  const extras = [];
  for (const material of list) {
    if (material.userData?.colorMat) extras.push(material.userData.colorMat);
    if (material.userData?.lineMat) extras.push(material.userData.lineMat);
  }
  return [...list, ...extras];
}

function applyLook() {
  const line = look === "line";
  ambient.intensity = line ? 0 : 1.7;
  key.intensity = line ? 0 : 2.5;
  fill.intensity = line ? 0 : 1.15;
  packs.forEach((pack) => {
    if (!pack) return;
    pack.group.traverse((child) => {
      const list = paintObject(child);
      if (!list.length) return;
      const next = list.map((material) => {
        if (material.userData?.isEdge) {
          if (material.color) material.color.copy(line ? INK : material.userData.paintColor || INK);
          return material;
        }
        const colorMat = material.userData?.colorMat || material;
        const lineMat = material.userData?.lineMat;
        if (line) return lineMat || material;
        return colorMat;
      });
      child.material = Array.isArray(child.material) ? next : next[0];
    });
  });
}

function prepare(group) {
  const found = [];
  group.traverse((object) => {
    paintObject(object);
    const name = object.userData && object.userData.fileName;
    if (!name || !/\.dat$/i.test(name) || object.type !== "Group") return;
    found.push(object);
  });

  group.updateWorldMatrix(true, true);
  const center = new THREE.Vector3();
  const spots = found.map((brick) => {
    const spot = new THREE.Vector3();
    brick.getWorldPosition(spot);
    center.add(spot);
    return spot;
  });
  if (found.length) center.multiplyScalar(1 / found.length);

  found.forEach((brick, index) => {
    const dir = spots[index].clone().sub(center);
    if (dir.lengthSq() < 1) dir.set(0, 1, 0);
    dir.y += dir.length() * 0.45;
    dir.normalize();
    const parentInv = brick.parent.matrixWorld.clone().invert();
    brick.userData.rest = brick.position.clone();
    brick.userData.localDir = dir.transformDirection(parentInv);
  });
  return found;
}

function apply() {
  const removed = (amount / 100) * bricks.length;
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];
    const fromEnd = bricks.length - 1 - i;
    const progress = Math.min(1, Math.max(0, removed - fromEnd));
    brick.position
      .copy(brick.userData.rest)
      .addScaledVector(brick.userData.localDir, progress * LIFT);
    brick.visible = progress < 0.98;
    brick.traverse((child) => {
      for (const material of currentMaterials(child)) {
        const base = material.userData.baseOpacity ?? 1;
        material.opacity = base * (1 - progress);
      }
    });
  }
  renderer.render(scene, camera);
}

function bind(selector, applyValue) {
  const input = document.querySelector(selector);
  if (!input) return;
  const readout = input.parentElement.querySelector("[data-readout]");
  const sync = () => {
    const value = Number(input.value);
    input.setAttribute("aria-valuenow", String(value));
    applyValue(value, readout);
  };
  input.addEventListener("input", sync);
  sync();
}

bind("[data-model-slider]", (value) => {
  amount = value;
  apply();
});

bind("[data-model-zoom]", (value, readout) => {
  viewControls.zoom = value;
  if (readout) readout.textContent = `${value}%`;
  pose();
  renderer.render(scene, camera);
});

bind("[data-model-turn]", (value) => {
  viewControls.turn = value;
  syncViewReadouts();
  pose();
  renderer.render(scene, camera);
});

bind("[data-model-tilt]", (value) => {
  viewControls.tilt = value;
  syncViewReadouts();
  pose();
  renderer.render(scene, camera);
});

function updateFollowPointer(clientX, clientY) {
  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.5;
  const nx = THREE.MathUtils.clamp((clientX - cx) / Math.max(cx, 1), -1, 1);
  const ny = THREE.MathUtils.clamp((clientY - cy) / Math.max(cy, 1), -1, 1);
  followMouse.targetTurn = -nx * FOLLOW_TURN;
  followMouse.targetTilt = -ny * FOLLOW_TILT;
}

function resetFollowPointer() {
  followMouse.targetTurn = 0;
  followMouse.targetTilt = 0;
}

function snapFollowPointer() {
  followMouse.turn = 0;
  followMouse.tilt = 0;
  followMouse.targetTurn = 0;
  followMouse.targetTilt = 0;
  syncViewReadouts();
  pose();
}

function stepFollowSmooth(dt) {
  const blend = 1 - Math.exp(-FOLLOW_SMOOTH * dt);
  const prevTurn = followMouse.turn;
  const prevTilt = followMouse.tilt;
  followMouse.turn += (followMouse.targetTurn - followMouse.turn) * blend;
  followMouse.tilt += (followMouse.targetTilt - followMouse.tilt) * blend;
  if (
    Math.abs(followMouse.turn - prevTurn) > 0.02 ||
    Math.abs(followMouse.tilt - prevTilt) > 0.02
  ) {
    syncViewReadouts();
    pose();
  }
}

const followCheckbox = document.querySelector("[data-model-follow-mouse]");
if (followCheckbox) {
  followCheckbox.addEventListener("change", () => {
    followMouse.active = followCheckbox.checked;
    card.classList.toggle("is-follow-mouse", followMouse.active);
    if (!followMouse.active) snapFollowPointer();
    else syncViewReadouts();
  });
}

window.addEventListener("mousemove", (event) => {
  if (!followMouse.active) return;
  updateFollowPointer(event.clientX, event.clientY);
});

window.addEventListener("mouseleave", () => {
  if (!followMouse.active) return;
  resetFollowPointer();
});

bind("[data-model-x]", (value, readout) => {
  viewControls.x = value;
  if (readout) readout.textContent = String(value);
  pose();
  renderer.render(scene, camera);
});

bind("[data-model-y]", (value, readout) => {
  viewControls.y = value;
  if (readout) readout.textContent = String(value);
  pose();
  renderer.render(scene, camera);
});

function tick(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (followMouse.active) stepFollowSmooth(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

resize();
new ResizeObserver(resize).observe(canvas);
requestAnimationFrame(tick);

const packs = [];
const pickButtons = [...document.querySelectorAll("[data-model-pick]")];
let pending = 0;

function show(index) {
  pending = index;
  pickButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.modelPick === String(index) ? "true" : "false");
  });
  const pack = packs[index];
  if (!pack) return;
  packs.forEach((item, i) => {
    if (item) item.group.visible = i === index;
  });
  bricks = bricksOf(pack);
  home = pack.home;
  applyLook();
  apply();
  pose();
  renderer.render(scene, camera);
}

const lookButtons = [...document.querySelectorAll("[data-model-look]")];
lookButtons.forEach((button) => {
  button.addEventListener("click", () => {
    look = button.dataset.modelLook === "line" ? "line" : "color";
    lookButtons.forEach((item) => {
      item.setAttribute("aria-pressed", item.dataset.modelLook === look ? "true" : "false");
    });
    applyLook();
    apply();
    renderer.render(scene, camera);
  });
});

function bricksOf(pack) {
  if (!pack.bricks) pack.bricks = prepare(pack.group);
  return pack.bricks;
}

function mount(spec, index, model) {
  const group = frame(model, spec.scale ?? 1);
  group.visible = false;
  pivot.add(group);
  group.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(group);
  packs[index] = {
    group,
    bricks: null,
    home: {
      center: bounds.getCenter(new THREE.Vector3()),
      size: bounds.getSize(new THREE.Vector3()),
      fitScale: spec.scale ?? 1,
      fitPad: spec.fitPad ?? 1,
    },
  };
  card.dataset.modelsReady = String(packs.filter(Boolean).length);
  if (index === 0 || pending === index) {
    show(index);
    card.classList.add("is-ready");
    resize();
  }
}

pickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    show(Number(button.dataset.modelPick));
  });
});

const files = MODELS.map(async (spec) => {
  const response = await fetch(spec.url);
  if (!response.ok) throw new Error(spec.url);
  return response.text();
});
await loader.preloadMaterials(LIBRARY + "LDConfig.ldr");
const order = [0, 2, 1, 3];
for (const i of order) {
  try {
    mount(MODELS[i], i, await parse(prepareText(MODELS[i], await files[i])));
  } catch (error) {
    console.error("Failed to open", MODELS[i].name, error);
  }
}
