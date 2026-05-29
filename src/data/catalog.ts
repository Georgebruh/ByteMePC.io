// Live catalog queries. Each part table has its own shape in the DB
// (cpu has cores/frequency, gpu has memory/tdp, etc.) so we collapse
// every row into the shared `Part` shape PartCard.vue already expects.

import { supabase } from '../lib/supabase'
import type { Part, PartCategory } from './mock'

// DB stores prices in USD; the UI is PHP throughout. Convert once at the
// boundary so downstream code (filters, sort, formatter) only ever sees PHP.
// Adjust this when the working exchange rate moves materially.
const USD_TO_PHP = 57

// Emoji placeholder shown on PartCard when image_link is null.
const ICONS: Record<PartCategory, string> = {
  cpu: '🖥',
  motherboard: '🧩',
  gpu: '🎮',
  ram: '💾',
  storage: '🗄',
  psu: '💡',
  case: '📦',
  cooler: '❄',
}

// DB table + spec-builder for each category. Centralising this here
// means BrowseView never has to know the underlying column names.
interface CategoryConfig<Row> {
  table: string
  idCol: keyof Row & string
  toSpec: (row: Row) => string
}

interface CpuRow    { cpu_id: number;    name: string; brand: string; core_numbers: number; frequency: number; socket: string; price: number }
interface MbRow     { mb_id: number;     name: string; brand: string; socket: string; size: string; ram_type: string; price: number }
interface GpuRow    { gpu_id: number;    name: string; brand: string; memory: number; core_clock: number; tdp: number; price: number }
interface RamRow    { ram_id: number;    name: string; brand: string; type: string; capacity: number; speed: number; price: number }
interface StorageRow { storage_id: number; name: string; brand: string; type: string; capacity: number; interface: string; price: number }
interface PsuRow    { psu_id: number;    name: string; brand: string; wattage: number; efficiency_rating: string; form_factor: string; price: number }
interface CaseRow   { case_id: number;   name: string; brand: string; price: number; case_supported_size: { size: string }[] }
interface CoolerRow { cooler_id: number; name: string; brand: string; type: string; tdp_rating: number; price: number; cooler_socket: { socket: string }[] }

// `extras` lets us hoist typed columns (socket, cores, ramType, tdp, wattage,
// size, caseSizes, coolerSockets, tdpRating) onto the Part so the catalog
// filter sidebar + the manual builder's compat engine can match on them
// without re-parsing the spec string.
interface CategoryConfigExt<Row> extends CategoryConfig<Row> {
  extras?: (row: Row) => Partial<Pick<Part, 'socket' | 'cores' | 'ramType' | 'tdp' | 'wattage' | 'size' | 'caseSizes' | 'coolerSockets' | 'tdpRating'>>
}

const CONFIGS = {
  cpu: {
    table: 'cpu',
    idCol: 'cpu_id',
    toSpec: (r: CpuRow) => `${r.core_numbers} cores · ${r.socket} · ${r.frequency}GHz base`,
    extras: (r: CpuRow) => ({ socket: r.socket, cores: r.core_numbers }),
  } satisfies CategoryConfigExt<CpuRow>,
  motherboard: {
    table: 'motherboard',
    idCol: 'mb_id',
    toSpec: (r: MbRow) => `${r.size} · ${r.socket} · ${r.ram_type}`,
    extras: (r: MbRow) => ({ socket: r.socket, ramType: r.ram_type as 'DDR4' | 'DDR5', size: r.size }),
  } satisfies CategoryConfigExt<MbRow>,
  gpu: {
    table: 'gpu',
    idCol: 'gpu_id',
    toSpec: (r: GpuRow) => `${r.memory}GB · ${r.core_clock}MHz · ${r.tdp}W TDP`,
    extras: (r: GpuRow) => ({ tdp: r.tdp }),
  } satisfies CategoryConfigExt<GpuRow>,
  ram: {
    table: 'ram',
    idCol: 'ram_id',
    toSpec: (r: RamRow) => `${r.capacity}GB · ${r.type} · ${r.speed}MHz`,
    extras: (r: RamRow) => ({ ramType: r.type as 'DDR4' | 'DDR5' }),
  } satisfies CategoryConfigExt<RamRow>,
  storage: {
    table: 'storage',
    idCol: 'storage_id',
    toSpec: (r: StorageRow) => `${r.capacity}GB · ${r.type} · ${r.interface}`,
  } satisfies CategoryConfigExt<StorageRow>,
  psu: {
    table: 'psu',
    idCol: 'psu_id',
    toSpec: (r: PsuRow) => `${r.wattage}W · ${r.efficiency_rating} · ${r.form_factor}`,
    extras: (r: PsuRow) => ({ wattage: r.wattage }),
  } satisfies CategoryConfigExt<PsuRow>,
  case: {
    table: 'pc_case',
    idCol: 'case_id',
    toSpec: (r: CaseRow) => {
      const sizes = r.case_supported_size?.map(s => s.size).join(' / ')
      return sizes ? `Fits ${sizes}` : 'Case'
    },
    extras: (r: CaseRow) => ({
      caseSizes: r.case_supported_size?.map(s => s.size) ?? [],
    }),
  } satisfies CategoryConfigExt<CaseRow>,
  cooler: {
    table: 'cpu_cooler',
    idCol: 'cooler_id',
    toSpec: (r: CoolerRow) => `${r.type} · ${r.tdp_rating}W TDP`,
    extras: (r: CoolerRow) => ({
      tdpRating: r.tdp_rating,
      coolerSockets: r.cooler_socket?.map(s => s.socket) ?? [],
    }),
  } satisfies CategoryConfigExt<CoolerRow>,
}

// Fetch every part in a category and project it onto the Part shape.
// Throws if the query fails — callers render an error state.
export async function fetchPartsByCategory(category: PartCategory): Promise<Part[]> {
  const cfg = CONFIGS[category]
  const { data, error } = await supabase
    .from(cfg.table)
    .select(`${cfg.idCol}, name, brand, price, ${specColumns(category)}`)
    .order(cfg.idCol, { ascending: true })

  if (error) throw error
  if (!data) return []

  const extras = (cfg as { extras?: (r: any) => Partial<Part> }).extras
  return (data as any[]).map(row => ({
    id: `${category}-${row[cfg.idCol]}`,
    category,
    brand: row.brand,
    name: row.name,
    spec: (cfg.toSpec as (r: any) => string)(row),
    price: Math.round(Number(row.price) * USD_TO_PHP),
    icon: ICONS[category],
    ...(extras ? extras(row) : {}),
  }))
}

// Pull every category in parallel and concatenate. Used by the catalog
// when no category filter is active — the grid shows the full inventory.
export async function fetchAllParts(): Promise<Part[]> {
  const cats: PartCategory[] = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case', 'cooler']
  const results = await Promise.all(cats.map(fetchPartsByCategory))
  return results.flat()
}

// Counts shown on the segmented category tabs.
export async function fetchCategoryCounts(): Promise<Record<PartCategory, number>> {
  const cats: PartCategory[] = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case', 'cooler']
  const results = await Promise.all(
    cats.map(c =>
      supabase.from(CONFIGS[c].table).select('*', { count: 'exact', head: true }),
    ),
  )
  const counts = {} as Record<PartCategory, number>
  cats.forEach((c, i) => { counts[c] = results[i].count ?? 0 })
  return counts
}

// Extra columns beyond the common (id, name, brand, price) needed to
// build the spec line for each category.
function specColumns(category: PartCategory): string {
  switch (category) {
    case 'cpu':         return 'core_numbers, frequency, socket'
    case 'motherboard': return 'socket, size, ram_type'
    case 'gpu':         return 'memory, core_clock, tdp'
    case 'ram':         return 'type, capacity, speed'
    case 'storage':     return 'type, capacity, interface'
    case 'psu':         return 'wattage, efficiency_rating, form_factor'
    case 'case':        return 'case_supported_size(size)'
    case 'cooler':      return 'type, tdp_rating, cooler_socket(socket)'
  }
}
