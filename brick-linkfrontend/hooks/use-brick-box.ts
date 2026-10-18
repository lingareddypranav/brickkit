"use client"

import { useEffect, useState } from "react"
import { emptyCollection, modelById, sampleCollection } from "@/lib/demo/catalog"
import { availablePieces, matchInventory } from "@/lib/demo/inventory"
import { readCollection } from "@/lib/demo/state"
import type { Collection } from "@/lib/demo/types"

export const STORAGE_KEY = "brick-kit:brick-box:v1"

export function useBrickBox() {
  const [collection, setCollection] = useState<Collection>(emptyCollection)
  const [hydrated, setHydrated] = useState(false)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setCollection(raw === null ? structuredClone(sampleCollection) : readCollection(raw))
    } catch { setCollection(structuredClone(sampleCollection)); setStorageError(true) }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collection)) }
    catch { setStorageError(true) }
  }, [collection, hydrated])

  function setQuantity(id: string, quantity: number) {
    setCollection(current => {
      const sets = { ...current.sets }
      const count = Math.min(9, Math.max(0, Math.floor(quantity)))
      if (count) sets[id] = { quantity: count, keepBuilt: sets[id]?.keepBuilt ?? false }
      else delete sets[id]
      return { ...current, sets }
    })
  }
  function toggleSet(id: string) {
    setCollection(current => current.sets[id] ? { ...current, sets: { ...current.sets, [id]: { ...current.sets[id], keepBuilt: !current.sets[id].keepBuilt } } } : current)
  }
  function adjustLoose(key: string, change: number) {
    setCollection(current => {
      const loose = { ...current.loose }
      const quantity = Math.min(999, Math.max(0, (loose[key] ?? 0) + change))
      if (quantity) loose[key] = quantity
      else delete loose[key]
      return { ...current, loose }
    })
  }
  function toggleWish(modelId: string) {
    setCollection(current => ({ ...current, wishlist: current.wishlist.includes(modelId) ? current.wishlist.filter(id => id !== modelId) : [...current.wishlist, modelId] }))
  }
  function saveCreation(modelId: string, keepBuilt: boolean) {
    const id = crypto.randomUUID()
    setCollection(current => {
      const model = modelById[modelId]
      if (!model || !matchInventory(model.inventory, availablePieces(current)).ready) return current
      return { ...current, creations: [...current.creations, { id, modelId, keepBuilt }], wishlist: current.wishlist.filter(id => id !== modelId) }
    })
  }
  function toggleCreation(id: string) {
    setCollection(current => ({ ...current, creations: current.creations.map(creation => {
      if (creation.id !== id) return creation
      if (!creation.keepBuilt && !matchInventory(modelById[creation.modelId].inventory, availablePieces(current)).ready) return creation
      return { ...creation, keepBuilt: !creation.keepBuilt }
    }) }))
  }

  return { collection, hydrated, storageError, setQuantity, toggleSet, adjustLoose, toggleWish, saveCreation, toggleCreation,
    loadSample: () => setCollection(structuredClone(sampleCollection)),
    startEmpty: () => setCollection(structuredClone(emptyCollection)),
  }
}

export type BrickBox = ReturnType<typeof useBrickBox>
