import { emptyCollection, modelById, partByKey, setById } from "./catalog"
import type { Collection } from "./types"

const quantity = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)

export function readCollection(raw: string | null): Collection {
  try {
    const value: unknown = JSON.parse(raw ?? "null")
    if (!object(value) || value.version !== 1) return structuredClone(emptyCollection)
    const sets: Collection["sets"] = {}
    if (object(value.sets)) for (const [id, item] of Object.entries(value.sets)) {
      if (!setById[id] || !object(item)) continue
      const count = quantity(item.quantity, 9)
      if (count) sets[id] = { quantity: count, keepBuilt: item.keepBuilt === true }
    }
    const loose: Collection["loose"] = {}
    if (object(value.loose)) for (const [key, n] of Object.entries(value.loose)) {
      if (partByKey[key] && quantity(n, 999)) loose[key] = quantity(n, 999)
    }
    const ids = new Set<string>()
    const creations: Collection["creations"] = []
    if (Array.isArray(value.creations)) for (const item of value.creations.slice(0, 30)) {
      if (!object(item) || typeof item.id !== "string" || typeof item.modelId !== "string" || !modelById[item.modelId] || ids.has(item.id)) continue
      ids.add(item.id)
      creations.push({ id: item.id, modelId: item.modelId, keepBuilt: item.keepBuilt === true })
    }
    const wishlist = Array.isArray(value.wishlist) ? [...new Set(value.wishlist.filter((id): id is string => typeof id === "string" && !!modelById[id]))] : []
    return { version: 1, sets, loose, creations, wishlist }
  } catch { return structuredClone(emptyCollection) }
}
