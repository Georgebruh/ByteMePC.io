// Supabase-backed build queries. Mirrors the conventions in catalog.ts —
// shapes are flattened into the existing Build / BuildPartRef types so
// every view that already consumes mock.builds keeps working.
//
// Prices are stored in USD in the DB; we convert once at this boundary
// so downstream code only ever sees PHP (matching the catalog module).

import { supabase } from '../lib/supabase'
import type { Build, BuildPartRef } from './mock'

const USD_TO_PHP = 57

// Map each slot's DB row to the BuildPartRef shape (tag + name + sub + price).
// Sub-lines mirror catalog.ts so a card on the feed and a slot on detail read
// the same way.
const slotMappers = {
  cpu: (r: any): BuildPartRef => ({
    tag: 'CPU',
    name: r.name,
    sub: `${r.core_numbers} cores · ${r.socket} · ${r.frequency}GHz`,
    price: usdToPhp(r.price),
    socket: r.socket,
  }),
  motherboard: (r: any): BuildPartRef => ({
    tag: 'MOBO',
    name: r.name,
    sub: `${r.size} · ${r.socket} · ${r.ram_type}`,
    price: usdToPhp(r.price),
    socket: r.socket,
    size: r.size,
    ramType: r.ram_type as 'DDR4' | 'DDR5',
  }),
  gpu: (r: any): BuildPartRef => ({
    tag: 'GPU',
    name: r.name,
    sub: `${r.memory}GB · ${r.tdp}W TDP`,
    price: usdToPhp(r.price),
    tdp: r.tdp,
  }),
  psu: (r: any): BuildPartRef => ({
    tag: 'PSU',
    name: r.name,
    sub: `${r.wattage}W · ${r.efficiency_rating}`,
    price: usdToPhp(r.price),
    wattage: r.wattage,
  }),
  case: (r: any): BuildPartRef => {
    const sizes: string[] = (r.case_supported_size ?? []).map((s: any) => s.size)
    return {
      tag: 'CASE',
      name: r.name,
      sub: sizes.length ? `Fits ${sizes.join(' / ')}` : r.brand,
      price: usdToPhp(r.price),
      caseSizes: sizes,
    }
  },
  cooler: (r: any): BuildPartRef => {
    const sockets: string[] = (r.cooler_socket ?? []).map((s: any) => s.socket)
    return {
      tag: 'COOLER',
      name: r.name,
      sub: `${r.type} · ${r.tdp_rating}W rating`,
      price: usdToPhp(r.price),
      coolerSockets: sockets,
    }
  },
  ram: (r: any, qty: number): BuildPartRef => ({
    tag: 'RAM',
    name: qty > 1 ? `${r.name} ×${qty}` : r.name,
    sub: `${r.type} · ${r.capacity}GB · ${r.speed}MHz`,
    price: usdToPhp(r.price) * qty,
    ramType: r.type as 'DDR4' | 'DDR5',
  }),
  storage: (r: any, qty: number): BuildPartRef => ({
    tag: 'STORAGE',
    name: qty > 1 ? `${r.name} ×${qty}` : r.name,
    sub: `${r.type} · ${r.capacity}GB · ${r.interface}`,
    price: usdToPhp(r.price) * qty,
  }),
}

function usdToPhp(n: number | string): number {
  return Math.round(Number(n) * USD_TO_PHP)
}

// One Supabase select string used by every "build with parts" query — keeps
// the projection identical whether we're listing or fetching a single row.
const BUILD_SELECT = `
  build_id, user_id, name, description, is_public, views, created_at, updated_at,
  cpu:cpu_id ( cpu_id, name, brand, core_numbers, frequency, socket, price ),
  motherboard:mb_id ( mb_id, name, brand, socket, size, ram_type, price ),
  gpu:gpu_id ( gpu_id, name, brand, memory, core_clock, tdp, price ),
  psu:psu_id ( psu_id, name, brand, wattage, efficiency_rating, price ),
  case:case_id ( case_id, name, brand, price, case_supported_size ( size ) ),
  cooler:cooler_id ( cooler_id, name, brand, type, tdp_rating, price, cooler_socket ( socket ) ),
  build_ram ( quantity, ram ( ram_id, name, brand, type, capacity, speed, price ) ),
  build_storage ( quantity, storage ( storage_id, name, brand, type, capacity, interface, price ) ),
  profile:user_id ( username )
`

interface BuildRow {
  build_id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  views: number
  created_at: string
  updated_at: string
  cpu: any | null
  motherboard: any | null
  gpu: any | null
  psu: any | null
  case: any | null
  cooler: any | null
  build_ram: Array<{ quantity: number; ram: any }>
  build_storage: Array<{ quantity: number; storage: any }>
  profile: { username: string } | null
}

// Flatten one DB row into the shared Build shape.
function rowToBuild(row: BuildRow, favouritedIds: Set<string>): Build {
  const parts: BuildPartRef[] = []
  if (row.cpu)         parts.push(slotMappers.cpu(row.cpu))
  if (row.motherboard) parts.push(slotMappers.motherboard(row.motherboard))
  if (row.gpu)         parts.push(slotMappers.gpu(row.gpu))
  for (const r of row.build_ram ?? []) {
    if (r.ram) parts.push(slotMappers.ram(r.ram, r.quantity))
  }
  for (const s of row.build_storage ?? []) {
    if (s.storage) parts.push(slotMappers.storage(s.storage, s.quantity))
  }
  if (row.psu)    parts.push(slotMappers.psu(row.psu))
  if (row.case)   parts.push(slotMappers.case(row.case))
  if (row.cooler) parts.push(slotMappers.cooler(row.cooler))

  const totalPrice = parts.reduce((sum, p) => sum + p.price, 0)

  // Lightweight tag derivation: brand + family pulled from the CPU/GPU/RAM
  // slots so the card chips look like the mock data without a tags column.
  const tags: string[] = []
  if (row.cpu?.name) tags.push(shortCpu(row.cpu.name))
  if (row.gpu?.name) tags.push(shortGpu(row.gpu.name))
  if (row.motherboard?.ram_type) tags.push(row.motherboard.ram_type)

  return {
    id: row.build_id,
    name: row.name,
    user: row.profile?.username ? `@${row.profile.username}` : '@anonymous',
    desc: row.description ?? '',
    tags,
    totalPrice,
    isPublic: row.is_public,
    views: row.views,
    favourited: favouritedIds.has(row.build_id),
    parts,
    icon: row.gpu?.name?.includes('RTX 40') ? '🚀' : '🖥',
    updatedAt: row.updated_at,
    ownerUserId: row.user_id,
  }
}

function shortCpu(name: string): string {
  // "Intel Core i9-14900K" -> "i9-14900K"
  const m = name.match(/(i[3579]-\d{4,5}[A-Z]*|Ryzen [3579] \d{3,4}[A-Z0-9]*)/)
  return m ? m[0] : name
}

function shortGpu(name: string): string {
  // "GeForce RTX 4080 Super" -> "RTX 4080 Super"
  return name.replace(/^GeForce\s+/, '').replace(/^Radeon\s+/, '')
}

// ─── Queries ────────────────────────────────────────────

// All builds visible in the public Field Notes feed.
// `favouritedIds` (optional) is used to mark the heart state per card.
export async function fetchPublicBuilds(favouritedIds: Set<string> = new Set()): Promise<Build[]> {
  const { data, error } = await supabase
    .from('builds')
    .select(BUILD_SELECT)
    .eq('is_public', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as unknown as BuildRow[] ?? []).map(r => rowToBuild(r, favouritedIds))
}

// Builds owned by the current authenticated user (private + public).
export async function fetchMyBuilds(userId: string): Promise<Build[]> {
  const { data, error } = await supabase
    .from('builds')
    .select(BUILD_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as unknown as BuildRow[] ?? []).map(r => rowToBuild(r, new Set()))
}

// Builds the current user has favourited. Two-step: get the ids first,
// then fetch the build rows in one query.
export async function fetchFavouriteBuilds(userId: string): Promise<Build[]> {
  const { data: favRows, error: favErr } = await supabase
    .from('favorite_builds')
    .select('build_id')
    .eq('user_id', userId)

  if (favErr) throw favErr
  const ids = (favRows ?? []).map(r => r.build_id as string)
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('builds')
    .select(BUILD_SELECT)
    .in('build_id', ids)

  if (error) throw error
  const favSet = new Set(ids)
  return (data as unknown as BuildRow[] ?? []).map(r => rowToBuild(r, favSet))
}

// Detail-page fetch. Increments the view counter for public builds the
// caller doesn't own (best-effort; ignore failures).
export async function fetchBuildById(buildId: string, viewerId: string | null): Promise<Build | null> {
  const favSet = new Set<string>()
  if (viewerId) {
    const { data: favRows } = await supabase
      .from('favorite_builds')
      .select('build_id')
      .eq('user_id', viewerId)
      .eq('build_id', buildId)
    if (favRows?.length) favSet.add(buildId)
  }

  const { data, error } = await supabase
    .from('builds')
    .select(BUILD_SELECT)
    .eq('build_id', buildId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return rowToBuild(data as unknown as BuildRow, favSet)
}

// Look up just the set of build IDs the current user has favourited.
// Used by the public feed to render the heart state correctly.
export async function fetchFavouriteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorite_builds')
    .select('build_id')
    .eq('user_id', userId)

  if (error) throw error
  return new Set((data ?? []).map(r => r.build_id as string))
}

// Toggle the favourite state. Returns the new state.
export async function toggleFavourite(userId: string, buildId: string, currentlyFav: boolean): Promise<boolean> {
  if (currentlyFav) {
    const { error } = await supabase
      .from('favorite_builds')
      .delete()
      .eq('user_id', userId)
      .eq('build_id', buildId)
    if (error) throw error
    return false
  }
  const { error } = await supabase
    .from('favorite_builds')
    .insert({ user_id: userId, build_id: buildId })
  if (error) throw error
  return true
}

// Hard-delete a build the user owns.
export async function deleteBuild(buildId: string): Promise<void> {
  const { error } = await supabase
    .from('builds')
    .delete()
    .eq('build_id', buildId)
  if (error) throw error
}

// Fork: clone a build's part selections into a new private build owned by
// the current user. Junction rows (ram + storage) are copied row-for-row.
// Returns the new build_id so the caller can route into the editor.
export async function forkBuild(sourceBuildId: string, userId: string): Promise<string> {
  const { data: source, error: srcErr } = await supabase
    .from('builds')
    .select(`
      name, description,
      cpu_id, mb_id, gpu_id, psu_id, case_id, cooler_id,
      build_ram ( ram_id, quantity ),
      build_storage ( storage_id, quantity )
    `)
    .eq('build_id', sourceBuildId)
    .single()
  if (srcErr) throw srcErr

  const { data: inserted, error: insErr } = await supabase
    .from('builds')
    .insert({
      user_id: userId,
      name: `Fork of ${source.name}`,
      description: source.description,
      cpu_id: source.cpu_id,
      mb_id:  source.mb_id,
      gpu_id: source.gpu_id,
      psu_id: source.psu_id,
      case_id: source.case_id,
      cooler_id: source.cooler_id,
      is_public: false,
    })
    .select('build_id')
    .single()
  if (insErr) throw insErr
  const newId = inserted.build_id as string

  try {
    const ramRows = (source.build_ram ?? []).map((r: any) => ({
      build_id: newId, ram_id: r.ram_id, quantity: r.quantity,
    }))
    if (ramRows.length) {
      const { error } = await supabase.from('build_ram').insert(ramRows)
      if (error) throw error
    }

    const storRows = (source.build_storage ?? []).map((s: any) => ({
      build_id: newId, storage_id: s.storage_id, quantity: s.quantity,
    }))
    if (storRows.length) {
      const { error } = await supabase.from('build_storage').insert(storRows)
      if (error) throw error
    }
  } catch (e) {
    // Roll back the parent row so a half-copied fork doesn't linger.
    await supabase.from('builds').delete().eq('build_id', newId)
    throw e
  }

  return newId
}

// ─── Create / update builds ─────────────────────────────

// Inputs the builder passes in — one Part per slot, name + visibility.
// Shared between create and update.
export interface BuildInput {
  name: string
  description?: string | null
  isPublic: boolean
  cpu?: { id: string } | null
  motherboard?: { id: string } | null
  gpu?: { id: string } | null
  psu?: { id: string } | null
  case?: { id: string } | null
  cooler?: { id: string } | null
  ram?: { id: string } | null
}

export interface CreateBuildInput extends BuildInput {
  userId: string
}

// Parts in the catalog have stringy ids shaped like "cpu-13" — strip the
// category prefix to recover the numeric DB key.
function partIdToDbId(stringId: string | undefined | null): number | null {
  if (!stringId) return null
  const m = stringId.match(/-(\d+)$/)
  return m ? Number(m[1]) : null
}

// Build a column-level payload for the `builds` table from the shared
// BuildInput shape. Used by both create and update so the field mapping
// only lives in one place.
function buildRowPayload(input: BuildInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    is_public: input.isPublic,
    cpu_id:    partIdToDbId(input.cpu?.id),
    mb_id:     partIdToDbId(input.motherboard?.id),
    gpu_id:    partIdToDbId(input.gpu?.id),
    psu_id:    partIdToDbId(input.psu?.id),
    case_id:   partIdToDbId(input.case?.id),
    cooler_id: partIdToDbId(input.cooler?.id),
  }
}

// Replace the build's RAM junction rows with whatever's in the input
// (currently a single ram entry). Called by both create and update so
// the "RAM slot now empty" edit case actually removes the existing row.
async function replaceBuildRam(buildId: string, ramId: string | null | undefined): Promise<void> {
  // Drop any existing rows for this build first.
  const { error: delErr } = await supabase
    .from('build_ram')
    .delete()
    .eq('build_id', buildId)
  if (delErr) throw delErr

  const ramDbId = partIdToDbId(ramId)
  if (ramDbId === null) return

  const { error: insErr } = await supabase
    .from('build_ram')
    .insert({ build_id: buildId, ram_id: ramDbId, quantity: 1 })
  if (insErr) throw insErr
}

// Insert the build row + (optionally) one ram junction row. Returns the
// new build_id so the caller can navigate to /builds/:id.
export async function createBuild(input: CreateBuildInput): Promise<string> {
  const { data, error } = await supabase
    .from('builds')
    .insert({ ...buildRowPayload(input), user_id: input.userId })
    .select('build_id')
    .single()

  if (error) throw error
  const buildId = data.build_id as string

  try {
    await replaceBuildRam(buildId, input.ram?.id)
  } catch (e) {
    // Roll back the build so we don't leave an orphan row that the
    // user thinks was saved successfully.
    await supabase.from('builds').delete().eq('build_id', buildId)
    throw e
  }

  return buildId
}

// Update an existing build owned by the current user. RLS enforces
// ownership — non-owners just get 0 rows updated. The trailing select()
// surfaces silent zero-row writes (stale session, wrong id, RLS) as a
// thrown error instead of letting the caller think the save succeeded.
// Additionally verifies is_public round-trips so a silent column-level
// reject (rare, but possible with column policies) is also caught.
export async function updateBuild(buildId: string, input: BuildInput): Promise<void> {
  const { data, error } = await supabase
    .from('builds')
    .update(buildRowPayload(input))
    .eq('build_id', buildId)
    .select('build_id, is_public')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Update affected 0 rows. Sign in again, or you may not own this build.')
  }
  if (data[0].is_public !== input.isPublic) {
    throw new Error(
      `Visibility did not persist: requested ${input.isPublic}, DB returned ${data[0].is_public}.`,
    )
  }

  await replaceBuildRam(buildId, input.ram?.id)
}

// One-shot visibility flip used by the detail page's owner toggle.
// Touches only is_public so we can isolate the bug class where the full
// updateBuild payload composition might be at fault.
export async function updateBuildVisibility(buildId: string, isPublic: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('builds')
    .update({ is_public: isPublic })
    .eq('build_id', buildId)
    .select('build_id, is_public')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Visibility update affected 0 rows — sign in again or check ownership.')
  }
  if (data[0].is_public !== isPublic) {
    throw new Error(`Visibility did not persist: requested ${isPublic}, DB returned ${data[0].is_public}.`)
  }
}
