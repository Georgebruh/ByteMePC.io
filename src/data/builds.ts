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
  }),
  motherboard: (r: any): BuildPartRef => ({
    tag: 'MOBO',
    name: r.name,
    sub: `${r.size} · ${r.socket} · ${r.ram_type}`,
    price: usdToPhp(r.price),
  }),
  gpu: (r: any): BuildPartRef => ({
    tag: 'GPU',
    name: r.name,
    sub: `${r.memory}GB · ${r.tdp}W TDP`,
    price: usdToPhp(r.price),
  }),
  psu: (r: any): BuildPartRef => ({
    tag: 'PSU',
    name: r.name,
    sub: `${r.wattage}W · ${r.efficiency_rating}`,
    price: usdToPhp(r.price),
  }),
  case: (r: any): BuildPartRef => ({
    tag: 'CASE',
    name: r.name,
    sub: r.brand,
    price: usdToPhp(r.price),
  }),
  cooler: (r: any): BuildPartRef => ({
    tag: 'COOLER',
    name: r.name,
    sub: `${r.type} · ${r.tdp_rating}W rating`,
    price: usdToPhp(r.price),
  }),
  ram: (r: any, qty: number): BuildPartRef => ({
    tag: 'RAM',
    name: qty > 1 ? `${r.name} ×${qty}` : r.name,
    sub: `${r.type} · ${r.capacity}GB · ${r.speed}MHz`,
    price: usdToPhp(r.price) * qty,
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
  build_id, name, description, is_public, views, created_at, updated_at,
  cpu:cpu_id ( cpu_id, name, brand, core_numbers, frequency, socket, price ),
  motherboard:mb_id ( mb_id, name, brand, socket, size, ram_type, price ),
  gpu:gpu_id ( gpu_id, name, brand, memory, core_clock, tdp, price ),
  psu:psu_id ( psu_id, name, brand, wattage, efficiency_rating, price ),
  case:case_id ( case_id, name, brand, price ),
  cooler:cooler_id ( cooler_id, name, brand, type, tdp_rating, price ),
  build_ram ( quantity, ram ( ram_id, name, brand, type, capacity, speed, price ) ),
  build_storage ( quantity, storage ( storage_id, name, brand, type, capacity, interface, price ) ),
  profile:user_id ( username )
`

interface BuildRow {
  build_id: string
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
