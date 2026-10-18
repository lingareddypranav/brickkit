const { test } = require('node:test')
const assert = require('node:assert/strict')
const { models, sets, sampleCollection, emptyCollection } = require('../lib/demo/catalog.ts')
const { availablePieces, matchInventory, recommendSets, countPieces } = require('../lib/demo/inventory.ts')
const { readCollection } = require('../lib/demo/state.ts')

test('sample gives five ready builds and the rover needs exactly four tyres', () => {
  const available = availablePieces(sampleCollection)
  for (const model of models) {
    const match = matchInventory(model.inventory, available)
    if (model.id === 'moon-rover') assert.deepEqual(match.missing, { '87414:0': 4 })
    else assert.equal(match.ready, true, model.id)
  }
})
test('adding the four loose tyres unlocks the same rover without changing other stock', () => {
  const box = structuredClone(sampleCollection)
  box.loose['87414:0'] = 4
  assert.equal(matchInventory(models.find(m => m.id === 'moon-rover').inventory, availablePieces(box)).ready, true)
  assert.equal(countPieces(availablePieces(box)) - countPieces(availablePieces(sampleCollection)), 4)
})
test('keep built excludes every copy, and changing quantity multiplies pieces', () => {
  const box = structuredClone(emptyCollection)
  box.sets['10696-1'] = { quantity: 2, keepBuilt: false }
  assert.equal(availablePieces(box)['87414:0'], 8)
  box.sets['10696-1'].keepBuilt = true
  assert.equal(availablePieces(box)['87414:0'] ?? 0, 0)
  assert.equal(availablePieces(box, true)['87414:0'], 8)
})
test('saving a kept-built creation reserves its pieces and remixing releases them', () => {
  const box = structuredClone(sampleCollection)
  const before = countPieces(availablePieces(box))
  const model = models.find(m => m.id === 'sunny-duck')
  box.creations.push({ id: 'duck', modelId: model.id, keepBuilt: true })
  assert.equal(countPieces(availablePieces(box)), before - countPieces(model.inventory))
  box.creations[0].keepBuilt = false
  assert.equal(countPieces(availablePieces(box)), before)
})
test('recommendations close exactly the gaps they claim, without mutating ownership', () => {
  const before = JSON.stringify(sampleCollection)
  const rover = models.find(m => m.id === 'moon-rover')
  const available = availablePieces(sampleCollection)
  const suggestions = recommendSets(rover, available)
  assert.ok(suggestions.length)
  assert.equal(suggestions[0].remaining, 0)
  for (const suggestion of suggestions) {
    const withSets = { ...available }
    for (const set of suggestion.sets) for (const [k, n] of Object.entries(set.inventory)) withSets[k] = (withSets[k] ?? 0) + n
    assert.equal(matchInventory(rover.inventory, withSets).missingCount, suggestion.remaining)
  }
  assert.equal(JSON.stringify(sampleCollection), before)
})
test('all thumbnails, placements, and recipe inventories agree', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  for (const model of models) {
    const counts = {}
    model.placements.forEach(p => { counts[p.key] = (counts[p.key] ?? 0) + 1; assert.ok(p.step >= 1 && p.step <= model.steps.length) })
    assert.deepEqual(counts, model.inventory)
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', model.image)))
  }
  sets.forEach(s => assert.ok(countPieces(s.inventory) > 0, s.id))
})
test('bad or old storage is recoverable; unknown IDs and invalid quantities are discarded', () => {
  assert.deepEqual(readCollection('{broken'), emptyCollection)
  assert.deepEqual(readCollection('{"version":2}'), emptyCollection)
  const loaded = readCollection(JSON.stringify({ version: 1, sets: { 'fake': {quantity:4}, '10696-1': {quantity:2.8, keepBuilt:true} }, loose: {'87414:0':-3, 'madeup:4':10}, creations: [{id:'a',modelId:'fake'}], wishlist: ['fake','sunny-duck','sunny-duck'] }))
  assert.deepEqual(loaded.sets, {'10696-1':{quantity:2,keepBuilt:true}})
  assert.deepEqual(loaded.loose, {})
  assert.deepEqual(loaded.wishlist, ['sunny-duck'])
})
