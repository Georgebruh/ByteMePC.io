// Pin queries — the watch-list lives across eight per-category tables in
// the schema (pinned_cpus, pinned_gpus, …), each keyed by (user_id, <id>)
// with owner-only RLS. This module hides that fan-out behind the same
// `category-dbId` part-id strings the catalog already produces, so the
// catalog grid + Pinned screen can pin/unpin without knowing the table
// layout. Mirrors the conventions in catalog.ts / builds.ts.

import { supabase } from '../lib/supabase'
import type { Part, PartCategory } from './mock'
import { fetchPartsByCategory } from './catalog'

// Each catalog category maps to its pin table + the part-key column that
// table stores. Keeping it central means a new category only needs one
// entry here (and in catalog.ts) to pick up pinning end-to-end.
const PIN_CONFIG: Record<PartCategory, { table: string; idCol: string }> = {
  cpu:         { table: 'pinned_cpus',         idCol: 'cpu_id' },
  motherboard: { table: 'pinned_motherboards', idCol: 'mb_id' },
  gpu:         { table: 'pinned_gpus',         idCol: 'gpu_id' },
  ram:         { table: 'pinned_rams',         idCol: 'ram_id' },
  storage:     { table: 'pinned_storages',     idCol: 'storage_id' },
  psu:         { table: 'pinned_psus',         idCol: 'psu_id' },
  case:        { table: 'pinned_cases',        idCol: 'case_id' },
  cooler:      { table: 'pinned_coolers',      idCol: 'cooler_id' },
}

const CATEGORIES = Object.keys(PIN_CONFIG) as PartCategory[]

// Catalog part ids are shaped like "cpu-13" / "motherboard-5" — split off
// the category prefix to recover the numeric DB key the pin tables use.
function parsePartId(partId: string): { category: PartCategory; dbId: number } | null {
  const m = partId.match(/^([a-z_]+)-(\d+)$/)
  if (!m) return null
  const category = m[1] as PartCategory
  if (!(category in PIN_CONFIG)) return null
  return { category, dbId: Number(m[2]) }
}

// Full set of pinned part ids for a user, across every category. Returned
// as the same "category-dbId" strings the catalog uses so callers can do a
// cheap `set.has(part.id)` to mark grid cards as pinned.
export async function fetchPinnedIds(userId: string): Promise<Set<string>> {
  const results = await Promise.all(
    CATEGORIES.map(c =>
      supabase.from(PIN_CONFIG[c].table).select(PIN_CONFIG[c].idCol).eq('user_id', userId),
    ),
  )
  const ids = new Set<string>()
  CATEGORIES.forEach((c, i) => {
    if (results[i].error) throw results[i].error
    const idCol = PIN_CONFIG[c].idCol
    for (const row of (results[i].data ?? []) as unknown as Array<Record<string, number>>) {
      ids.add(`${c}-${row[idCol]}`)
    }
  })
  return ids
}

export interface PinnedPart extends Part {
  // ISO timestamp of when the part was pinned — formatted to "3d ago" at
  // render time on the Pinned screen.
  pinnedAt: string
}

// Every pinned part for a user, projected onto the shared Part shape and
// sorted newest-pin-first. Pulls pin rows (with timestamps) from all eight
// tables, then reuses the catalog projection for the categories that
// actually have pins so the cards read identically to the Browse grid.
export async function fetchPinnedParts(userId: string): Promise<PinnedPart[]> {
  const pinRes = await Promise.all(
    CATEGORIES.map(c =>
      supabase
        .from(PIN_CONFIG[c].table)
        .select(`${PIN_CONFIG[c].idCol}, pinned_at`)
        .eq('user_id', userId),
    ),
  )

  const pinnedAt = new Map<string, string>()
  const catsWithPins: PartCategory[] = []
  CATEGORIES.forEach((c, i) => {
    if (pinRes[i].error) throw pinRes[i].error
    const rows = (pinRes[i].data ?? []) as unknown as Array<Record<string, number | string>>
    if (rows.length) catsWithPins.push(c)
    const idCol = PIN_CONFIG[c].idCol
    for (const row of rows) {
      pinnedAt.set(`${c}-${row[idCol]}`, String(row.pinned_at))
    }
  })
  if (!catsWithPins.length) return []

  const partsByCat = await Promise.all(catsWithPins.map(fetchPartsByCategory))
  const out: PinnedPart[] = []
  for (const p of partsByCat.flat()) {
    const at = pinnedAt.get(p.id)
    if (at !== undefined) out.push({ ...p, pinned: true, pinnedAt: at })
  }
  return out.sort((a, b) => +new Date(b.pinnedAt) - +new Date(a.pinnedAt))
}

export async function pinPart(userId: string, partId: string): Promise<void> {
  const parsed = parsePartId(partId)
  if (!parsed) throw new Error(`Can't pin unrecognised part id: ${partId}`)
  const { table, idCol } = PIN_CONFIG[parsed.category]
  // Ignore duplicate-key errors so a double-click can't surface a failure
  // for something that's already pinned.
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, [idCol]: parsed.dbId }, { onConflict: `user_id,${idCol}` })
  if (error) throw error
}

export async function unpinPart(userId: string, partId: string): Promise<void> {
  const parsed = parsePartId(partId)
  if (!parsed) throw new Error(`Can't unpin unrecognised part id: ${partId}`)
  const { table, idCol } = PIN_CONFIG[parsed.category]
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq(idCol, parsed.dbId)
  if (error) throw error
}

// Flip the pin state. Returns the new state so optimistic UI can reconcile.
export async function togglePin(
  userId: string,
  partId: string,
  currentlyPinned: boolean,
): Promise<boolean> {
  if (currentlyPinned) {
    await unpinPart(userId, partId)
    return false
  }
  await pinPart(userId, partId)
  return true
}
