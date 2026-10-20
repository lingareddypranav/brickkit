const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  models,
  modelById,
  setById,
  partByKey,
  sets,
  sampleCollection,
  emptyCollection,
  findFamily,
} = require("../lib/demo/catalog.ts");
const {
  availablePieces,
  matchInventory,
  recommendSets,
  countPieces,
  addInventory,
} = require("../lib/demo/inventory.ts");
const { readCollection } = require("../lib/demo/state.ts");
const { selectIdeas } = require("../lib/demo/selectors.ts");
const { buildAssistantReply } = require("../lib/demo/chat-script.ts");

test("every gallery build has a verified model or original booklet source", () => {
  assert.ok(models.length >= 20);
  assert.equal(new Set(models.map((m) => m.id)).size, models.length);
  for (const model of models) {
    if (model.source.provider === "LEGO") {
      assert.match(
        model.source.url,
        /^https:\/\/www\.lego\.com\/en-us\/service\/building-instructions\//,
      );
      assert.match(
        model.source.instructionsUrl,
        /^https:\/\/www\.lego\.com\/cdn\/product-assets\/product\.bi\.core\.pdf\/\d+\.pdf$/,
      );
      assert.match(model.source.sha256, /^[a-f0-9]{64}$/);
      assert.equal(model.modelUrl, undefined);
      assert.ok(
        fs.statSync(path.join(__dirname, "../public", model.image)).size >
          10000,
      );
      continue;
    }
    assert.equal(model.source.provider, "LDraw OMR");
    assert.match(
      model.source.url,
      /^https:\/\/library\.ldraw\.org\/omr\/sets\//,
    );
    assert.match(model.source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(
      fs.statSync(path.join(__dirname, "../public", model.image)).size > 10000,
    );
    const file = fs.readFileSync(
      path.join(__dirname, "../public", model.modelUrl),
      "utf8",
    );
    assert.ok(file.startsWith("0 "));
    assert.ok(file.includes(`0 Author: ${model.source.author}`));
    assert.ok(file.includes(`0 !LICENSE ${model.source.license}`));
    assert.ok(!model.image.endsWith(".svg"));
    assert.deepEqual(model.placements, []);
    assert.deepEqual(model.steps, []); // Cached OMR guides use the separate instruction index.
  }
});

test("conservative source-set inventories agree with ownership for every model", () => {
  for (const model of models) {
    if (model.source.inventoryBasis === "source-set") {
      assert.deepEqual(model.inventory, setById[model.source.setId].inventory);
    } else {
      assert.equal(model.source.inventoryBasis, "model");
      for (const [key, n] of Object.entries(model.inventory))
        assert.ok(n <= (setById[model.source.setId].inventory[key] ?? 0));
    }
    const box = structuredClone(emptyCollection);
    box.sets[model.source.setId] = { quantity: 1, keepBuilt: false };
    assert.equal(
      matchInventory(model.inventory, availablePieces(box)).ready,
      true,
    );
    box.sets[model.source.setId].keepBuilt = true;
    assert.equal(
      matchInventory(model.inventory, availablePieces(box)).ready,
      false,
    );
    for (const [key, n] of Object.entries(model.inventory)) {
      assert.ok(partByKey[key], key);
      assert.ok(Number.isInteger(n) && n > 0);
    }
  }
});

test("strict mode shows only available models and honours the sample's kept-built racer", () => {
  const ready = selectIdeas(sampleCollection, {
    family: "all",
    onlyMyBricks: true,
    savedOnly: false,
  });
  assert.ok(ready.length >= 5);
  assert.ok(ready.every((idea) => idea.match.ready));
  assert.ok(!ready.some((idea) => idea.model.id === "blue-racer"));
  assert.ok(ready.some((idea) => idea.model.id === "cute-pug"));
  assert.equal(
    selectIdeas(emptyCollection, {
      family: "all",
      onlyMyBricks: true,
      savedOnly: false,
    }).length,
    0,
  );
});

test("instruction ready lists only picture-guide builds, not booklet dragons", () => {
  const ideas = selectIdeas(emptyCollection, {
    family: "all",
    onlyMyBricks: false,
    onlyInstructions: true,
    savedOnly: false,
  });
  assert.deepEqual(
    ideas.map((idea) => idea.model.id).sort(),
    ["green-dinosaur", "mini-shuttle", "shuttle-explorer", "space-transport"],
  );
  assert.ok(!ideas.some((idea) => idea.model.family === "dragons"));
});

test("dinosaurs, dragons and spacecraft use distinct sourced builds", () => {
  for (const family of ["dinosaurs", "dragons", "space"]) {
    const ideas = selectIdeas(emptyCollection, {
      family,
      onlyMyBricks: false,
      savedOnly: false,
    });
    assert.ok(ideas.length >= 2);
    assert.ok(
      ideas.every((idea) => idea.model.family === family && idea.model.source),
    );
  }
  assert.equal(findFamily("dinasours please"), "dinosaurs");
  assert.equal(findFamily("two spaceships"), "space");
  assert.equal(findFamily("a birthday cake"), null);
});

test("one missing piece stays blocked until the correct colour and quantity are available", () => {
  const model = modelById["cute-pug"];
  const box = structuredClone(emptyCollection);
  box.loose = { ...model.inventory };
  const key = Object.keys(model.inventory)[0];
  box.loose[key] -= 1;
  assert.deepEqual(
    matchInventory(model.inventory, availablePieces(box)).missing,
    { [key]: 1 },
  );
  box.loose[`${key.split(":")[0]}:9999`] = 1;
  assert.equal(
    matchInventory(model.inventory, availablePieces(box)).ready,
    false,
  );
  box.loose[key] += 1;
  assert.equal(
    matchInventory(model.inventory, availablePieces(box)).ready,
    true,
  );
});

test("keeping a source-set build reserves its pieces; remixing releases them", () => {
  const box = structuredClone(sampleCollection);
  const model = modelById["cute-pug"];
  const before = countPieces(availablePieces(box));
  box.creations.push({ id: "pug", modelId: model.id, keepBuilt: true });
  assert.equal(
    countPieces(availablePieces(box)),
    before - countPieces(model.inventory),
  );
  assert.equal(
    matchInventory(modelById.koala.inventory, availablePieces(box)).ready,
    false,
  );
  box.creations[0].keepBuilt = false;
  assert.equal(countPieces(availablePieces(box)), before);
});

test("quantities multiply inventory, and keep built protects all copies", () => {
  const box = structuredClone(emptyCollection);
  box.sets["30542-1"] = { quantity: 2, keepBuilt: false };
  assert.equal(
    countPieces(availablePieces(box)),
    countPieces(setById["30542-1"].inventory) * 2,
  );
  box.sets["30542-1"].keepBuilt = true;
  assert.equal(countPieces(availablePieces(box)), 0);
});

test("real set recommendations close the gaps they claim without changing the collection", () => {
  const model = modelById["shuttle-explorer"];
  const before = JSON.stringify(sampleCollection);
  const available = availablePieces(sampleCollection);
  const suggestions = recommendSets(model, available);
  assert.ok(suggestions.length);
  assert.equal(suggestions[0].remaining, 0);
  for (const suggestion of suggestions) {
    const next = { ...available };
    suggestion.sets.forEach((set) => addInventory(next, set.inventory));
    assert.equal(
      matchInventory(model.inventory, next).missingCount,
      suggestion.remaining,
    );
  }
  assert.equal(JSON.stringify(sampleCollection), before);
});

test("two-set suggestions appear when no single set can cover a quantity gap", () => {
  const key = "3001:1";
  const max = Math.max(...sets.map((set) => set.inventory[key] ?? 0));
  const model = { ...models[0], inventory: { [key]: max + 1 } };
  const suggestions = recommendSets(model, {});
  assert.ok(suggestions.some((s) => s.sets.length === 2 && s.remaining === 0));
  assert.ok(!suggestions.some((s) => s.sets.length === 1 && s.remaining === 0));
});

test("chat choices always point to current catalogue models", () => {
  for (const family of ["dragon", "dinosaur", "spaceship", "animal", "car"]) {
    const reply = buildAssistantReply(family, undefined, []);
    assert.ok(reply.choices.length >= 2);
    for (const choice of reply.choices) {
      assert.ok(choice.models.every((id) => models.some((m) => m.id === id)));
      const result = buildAssistantReply(choice.label, choice, []);
      assert.deepEqual(result.results, choice.models);
    }
  }
});

test("catalogue sets and both new and legacy saved creations survive reload", () => {
  const box = structuredClone(sampleCollection);
  box.sets["31088-1"] = { quantity: 2, keepBuilt: true };
  box.creations = [
    { id: "new", modelId: "cute-pug", keepBuilt: true },
    { id: "old", modelId: "sunny-duck", keepBuilt: true },
  ];
  box.wishlist = ["shark", "sunny-duck"];
  assert.deepEqual(readCollection(JSON.stringify(box)), box);
  const before = countPieces(availablePieces(box));
  box.creations[1].keepBuilt = false;
  assert.ok(countPieces(availablePieces(box)) >= before);
});

test("invalid storage is recoverable and unknown IDs cannot invent pieces", () => {
  assert.deepEqual(readCollection("{broken"), emptyCollection);
  assert.deepEqual(readCollection('{"version":2}'), emptyCollection);
  const loaded = readCollection(
    JSON.stringify({
      version: 1,
      sets: {
        fake: { quantity: 4 },
        "10696-1": { quantity: 2.8, keepBuilt: true },
      },
      loose: { "madeup:4": 10 },
      wishlist: ["fake", "cute-pug", "cute-pug"],
    }),
  );
  assert.deepEqual(loaded.sets, {
    "10696-1": { quantity: 2, keepBuilt: true },
  });
  assert.deepEqual(loaded.loose, {});
  assert.deepEqual(loaded.wishlist, ["cute-pug"]);
});

test("embedded Windows subpart paths resolve to the same Three.js names as their references", () => {
  const { normalizeEmbeddedPaths } = require("../lib/ldraw.ts");
  const source =
    "0 FILE model.ldr\r\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 s\\nested.dat\r\n0 FILE s\\nested.dat\r\n0 !LICENSE original licence\r\n0 FILE 48/high.dat";
  const normalized = normalizeEmbeddedPaths(source);
  assert.ok(normalized.includes("0 FILE parts/s/nested.dat"));
  assert.ok(normalized.includes("0 FILE p/48/high.dat"));
  assert.ok(normalized.includes("0 !LICENSE original licence"));
  assert.equal(normalizeEmbeddedPaths(normalized), normalized);
});

test("shopping favours sets that finish the build over incomplete purchases", () => {
  const suggestions = recommendSets(
    modelById["green-dinosaur"],
    availablePieces(sampleCollection),
  );
  // The sample already owns the dinosaur, so use an empty box for this purchase.
  const needed = recommendSets(modelById["green-dinosaur"], {});
  assert.ok(needed.length > 0);
  assert.ok(needed.every((s) => s.remaining === 0));
  assert.deepEqual(suggestions, []);
});

test("retired molded dragon creations retain their original inventory reservations", () => {
  const dragon = modelById["dragon-friend"];
  assert.equal(dragon.source.inventoryBasis, "model");
  assert.equal(countPieces(dragon.inventory), 8);
  assert.equal(dragon.inventory["6133:4"], 2);
  assert.ok(
    !Object.keys(dragon.inventory).some((key) => key.startsWith("3001:")),
  );
  assert.ok(countPieces(modelById["dragon-wagon"].inventory) > 8);
});

test("story demo builds have complete local picture guides with matching source files", () => {
  const crypto = require("node:crypto");
  const { instructionsFor } = require("../lib/demo/instructions.ts");
  for (const id of ["green-dinosaur", "mini-shuttle", "shuttle-explorer", "space-transport"]) {
    const guide = instructionsFor(id);
    assert.ok(guide && guide.kind === "pictures" && guide.steps.length > 1, id);
    assert.ok(guide.pdfUrl, `${id}: missing PDF booklet`);
    const booklet = fs.readFileSync(
      path.join(__dirname, "../public", guide.pdfUrl),
    );
    assert.equal(booklet.subarray(0, 5).toString(), "%PDF-");
    const source = fs.readFileSync(
      path.join(__dirname, "../public", modelById[id].modelUrl),
    );
    assert.equal(
      guide.sourceSha256,
      crypto
        .createHash("sha256")
        .update(source.toString("utf8").replace(/\r\n?/g, "\n"))
        .digest("hex"),
    );
    const prepared = fs.readFileSync(
      path.join(__dirname, "../public", guide.modelUrl),
      "utf8",
    );
    const main = prepared.split("0 FILE ")[1];
    assert.equal(
      (main.match(/^0 STEP$/gm) ?? []).length + 1,
      guide.steps.length,
    );
    const pictureHashes = new Set();
    for (const step of guide.steps) {
      assert.ok(step.title && step.pieces.length);
      const picture = fs.readFileSync(
        path.join(__dirname, "../public", step.image),
      );
      assert.equal(picture.subarray(1, 4).toString(), "PNG");
      pictureHashes.add(
        crypto.createHash("sha256").update(picture).digest("hex"),
      );
      for (const piece of step.pieces) {
        assert.ok(piece.count > 0 && piece.name);
        assert.doesNotMatch(piece.name, /~|Moved to|Obsolete/i);
        assert.ok(
          !/^\d+$/.test(piece.color),
          `Missing colour name: ${piece.id}`,
        );
        assert.ok(
          fs.statSync(path.join(__dirname, "../public", piece.image)).size >
            100,
        );
      }
    }
    assert.equal(
      pictureHashes.size,
      guide.steps.length,
      "Repeated final pictures cannot stand in for missing steps",
    );
  }
  assert.equal(instructionsFor("not-a-prepared-model"), undefined);
});

test("dragon suggestions are brick-built and use verified original assembly booklets", () => {
  const { instructionsFor } = require("../lib/demo/instructions.ts");
  const dragons = models.filter((m) => m.family === "dragons");
  assert.equal(dragons.length, 2);
  assert.ok(
    !models.some((m) => ["dragon-friend", "dragon-wagon"].includes(m.id)),
  );
  assert.equal(instructionsFor("dragon-friend"), undefined);
  assert.ok(
    !fs.existsSync(
      path.join(
        __dirname,
        "../public/demo/instructions/dragon-friend/instructions.pdf",
      ),
    ),
  );
  for (const model of dragons) {
    const guide = instructionsFor(model.id);
    if (model.id === "fire-dragon") {
      assert.equal(guide.kind, "pictures");
      assert.ok(guide.steps.length > 20);
      assert.equal(guide.pdfUrl, model.source.instructionsUrl);
      assert.ok(
        fs.existsSync(
          path.join(__dirname, "../public", guide.steps[0].image),
        ),
      );
    } else {
      assert.equal(guide.kind, "booklet");
      assert.equal(guide.provider, "LEGO");
      assert.equal(guide.pdfUrl, model.source.instructionsUrl);
      assert.ok(guide.pageCount >= 50);
      assert.equal(guide.startPage, 4);
    }
    assert.ok(countPieces(model.inventory) >= 100);
    for (const key of Object.keys(model.inventory)) {
      assert.ok(
        !["75174", "6129", "6129c01"].includes(key.split(":")[0]),
        "A molded body cannot substitute for building a dragon",
      );
    }
    const original = structuredClone(emptyCollection);
    original.sets[model.source.setId] = { quantity: 1, keepBuilt: false };
    const hydrated = readCollection(JSON.stringify(original));
    assert.equal(
      matchInventory(model.inventory, availablePieces(hydrated)).ready,
      true,
    );
    hydrated.creations.push({
      id: model.id,
      modelId: model.id,
      keepBuilt: true,
    });
    assert.equal(
      matchInventory(model.inventory, availablePieces(hydrated)).ready,
      false,
    );
    const suggestions = recommendSets(model, {});
    assert.ok(
      suggestions.some(
        (s) =>
          s.remaining === 0 &&
          s.sets.some((set) => set.id === model.source.setId),
      ),
    );
  }
});

test("retired creations survive storage reload without being reassigned a new dragon inventory", () => {
  const box = structuredClone(emptyCollection);
  box.loose = { ...modelById["dragon-friend"].inventory };
  box.creations.push({
    id: "old-dragon",
    modelId: "dragon-friend",
    keepBuilt: true,
  });
  const hydrated = readCollection(JSON.stringify(box));
  assert.equal(hydrated.creations[0].modelId, "dragon-friend");
  assert.equal(countPieces(availablePieces(hydrated)), 0);
  hydrated.creations[0].keepBuilt = false;
  assert.equal(countPieces(availablePieces(hydrated)), 8);
});

test("preview distinguishes supported requests from unsupported custom details", () => {
  const { classifyPreviewRequest } = require("../lib/demo/preview-prompts.ts");
  assert.deepEqual(classifyPreviewRequest("Can you please build a spaceship?"), { kind: "family", family: "space" });
  assert.equal(classifyPreviewRequest("A spaceship my dinosaur can ride").kind, "outside-preview");
  assert.equal(classifyPreviewRequest("a pink dinosaur with a swimming pool").kind, "outside-preview");
  assert.equal(classifyPreviewRequest("a cat").kind, "outside-preview");
  assert.equal(classifyPreviewRequest("constructor").kind, "outside-preview");
  assert.equal(classifyPreviewRequest("Surprise me!").kind, "explore");
  assert.equal(classifyPreviewRequest("DINASOURS PLEASE").kind, "family");
  for (const model of models) {
    const request = classifyPreviewRequest(`Please make a ${model.name}!`);
    assert.equal(request.kind, "build", model.id);
    assert.deepEqual(request.modelIds, [model.id]);
  }
});

test("unsupported ideas get a clear preview boundary and playable catalogue alternatives", () => {
  for (const prompt of ["a birthday cake", "a unicorn", "remix it with a trampoline", "a spaceship that fits a dinosaur"]) {
    const reply = buildAssistantReply(prompt, undefined, []);
    assert.match(reply.preview.title, /Blueprint Preview/);
    assert.equal(reply.results, undefined);
    assert.ok(reply.choices.length > 0 && reply.choices.length <= 3);
    for (const choice of reply.choices) {
      assert.equal(choice.models.length, 1);
      assert.ok(models.some(model => model.id === choice.models[0]));
      const next = buildAssistantReply(choice.label, choice, []);
      assert.deepEqual(next.results, choice.models);
      assert.equal(next.preview, undefined);
    }
  }
  const spacecraft = buildAssistantReply("a spaceship that fits a dinosaur", undefined, []);
  assert.ok(spacecraft.choices.every(choice => modelById[choice.models[0]].family === "space"));
});

test("preview alternatives respect strict inventory and picture instruction filters", () => {
  const allowed = selectIdeas(sampleCollection, {
    family: "all", onlyMyBricks: true, onlyInstructions: true, savedOnly: false,
  }).map(idea => idea.model.id);
  assert.ok(allowed.length > 0);
  const reply = buildAssistantReply("a unicorn spaceship", undefined, [], { allowedModelIds: allowed });
  assert.ok(reply.choices.every(choice => choice.models.every(id => allowed.includes(id))));
  const empty = buildAssistantReply("a birthday cake", undefined, [], { allowedModelIds: [] });
  assert.equal(empty.choices.length, 1);
  assert.equal(empty.choices[0].action, "explore-preview");
  assert.match(empty.text, /filters/);
  // Nothing silently relaxes the filters. The UI offers this explicit action.
  assert.equal(empty.results, undefined);
});

test("preview follows the current adventure for unsupported follow-up requests", () => {
  const space = buildAssistantReply("spaceship", undefined, []);
  assert.equal(space.preview, undefined);
  const next = buildAssistantReply("make it purple", undefined, [{ role: "assistant", choices: space.choices }]);
  assert.ok(next.preview);
  assert.ok(next.choices.every(choice => modelById[choice.models[0]].family === "space"));
  const typedChoice = buildAssistantReply(space.choices[0].label.toUpperCase(), undefined, [{ role: "assistant", choices: space.choices }]);
  assert.deepEqual(typedChoice.results, space.choices[0].models);
  const afterResults = buildAssistantReply("give it a swimming pool", undefined, [{ role: "assistant", ...typedChoice }]);
  assert.ok(afterResults.preview);
  assert.ok(afterResults.choices.every(choice => modelById[choice.models[0]].family === "space"));
});


test("category chips appear on request rather than after a preview blueprint", () => {
  const reply = buildAssistantReply("Mini Space Shuttle", undefined, []);
  assert.deepEqual(reply.results, ["mini-shuttle"]);
  assert.equal(reply.choices, undefined);
  const categories = buildAssistantReply("show me the categories", undefined, [{ role: "assistant", ...reply }]);
  assert.equal(categories.preview, undefined);
  assert.ok(categories.choices.length > 0);
  assert.ok(categories.choices.every(choice => choice.family));
  const selected = buildAssistantReply(categories.choices[0].label, categories.choices[0], []);
  assert.ok(selected.choices.every(choice => choice.models.length > 0));
});
