// Mock data used by every screen until the Supabase backend is wired up.
// Keeps screens deterministic and lets us cross-link by ID (e.g. clicking
// a part card on /browse opens the same part on /parts/:id).

export type PartCategory = 'cpu' | 'motherboard' | 'gpu' | 'ram' | 'storage' | 'psu' | 'case' | 'cooler'

export interface Part {
  id: string
  category: PartCategory
  brand: string
  name: string
  // One-line spec summary shown on cards.
  spec: string
  // Price stored in PHP — the design uses ₱ throughout.
  price: number
  // True if the user has pinned this part.
  pinned?: boolean
  // Optional emoji used as the placeholder image on cards.
  icon?: string
  // Product thumbnail URL (DB `image_link`). Falls back to `icon` when null.
  image?: string | null
  // Structured fields used by the catalog filter sidebar.
  // Populated for the categories that have them (CPU/Motherboard for socket,
  // CPU for cores) so the chips + counts can be real.
  socket?: string
  cores?: number
  // Extra compat fields used by the manual builder.
  // ramType: motherboard + ram. tdp: gpu. wattage: psu.
  // size: motherboard form factor (ATX/mATX/ITX).
  // caseSizes: MB form factors the case accepts.
  // coolerSockets: CPU sockets the cooler mounts on. tdpRating: cooler dissipation ceiling.
  ramType?: 'DDR4' | 'DDR5'
  tdp?: number
  wattage?: number
  size?: string
  caseSizes?: string[]
  coolerSockets?: string[]
  tdpRating?: number
}

export interface BuildPartRef {
  // Short label rendered as the row tag on Build Detail (CPU / GPU / etc).
  tag: string
  name: string
  sub: string
  price: number
  // Optional structured compat fields, populated by data/builds.ts when
  // they're known from the source row. Mirrors the catalog Part shape so
  // the detail view can run the same cross-part checks as the Builder.
  socket?: string
  ramType?: 'DDR4' | 'DDR5'
  size?: string
  caseSizes?: string[]
  coolerSockets?: string[]
  tdp?: number
  wattage?: number
}

export interface Build {
  id: string
  name: string
  user: string
  // Free-text summary shown under the title on cards.
  desc: string
  // Inline tag chips (chipset, GPU family, form factor — whatever the
  // owner felt was most "scannable" at a glance).
  tags: string[]
  // Aggregate price (sum of parts, cached for display).
  totalPrice: number
  // Public-feed visibility.
  isPublic: boolean
  // Author + engagement.
  views: number
  // Has the current user favourited this build?
  favourited?: boolean
  // The big parts list shown on Build Detail.
  parts: BuildPartRef[]
  // Big tile background icon on the card.
  icon: string
  // ISO timestamp of the last edit. Populated by the Supabase queries;
  // mock builds leave it undefined.
  updatedAt?: string
  // Auth user id of the build's owner. Used by the detail page to decide
  // whether to show owner-only controls (visibility toggle, edit, delete).
  ownerUserId?: string
}

// ─── Parts catalog ────────────────────────────────────────
// Six CPUs are the default browse view in the design preview.
export const parts: Part[] = [
  { id: 'cpu-13900k',  category: 'cpu', brand: 'Intel', name: 'Core i9-13900K',  spec: '24 cores · LGA1700 · 5.8GHz boost',          price: 32500, pinned: true, icon: '🖥' },
  { id: 'cpu-7950x',   category: 'cpu', brand: 'AMD',   name: 'Ryzen 9 7950X',   spec: '16 cores · AM5 · 5.7GHz boost',              price: 34900, icon: '🖥' },
  { id: 'cpu-13700k',  category: 'cpu', brand: 'Intel', name: 'Core i7-13700K',  spec: '16 cores · LGA1700 · 5.4GHz boost',          price: 22800, icon: '🖥' },
  { id: 'cpu-7800x3d', category: 'cpu', brand: 'AMD',   name: 'Ryzen 7 7800X3D', spec: '8 cores · AM5 · 5.0GHz boost · 3D V-Cache',  price: 26500, pinned: true, icon: '🖥' },
  { id: 'cpu-13600k',  category: 'cpu', brand: 'Intel', name: 'Core i5-13600K',  spec: '14 cores · LGA1700 · 5.1GHz boost',          price: 17200, icon: '🖥' },
  { id: 'cpu-7600x',   category: 'cpu', brand: 'AMD',   name: 'Ryzen 5 7600X',   spec: '6 cores · AM5 · 5.3GHz boost',               price: 14800, icon: '🖥' },

  // A handful of non-CPU parts so the Pinned screen can show a mix.
  { id: 'gpu-4090',    category: 'gpu',         brand: 'NVIDIA',  name: 'RTX 4090 Founders',         spec: '24GB GDDR6X · 450W TDP',      price: 94500, pinned: true, icon: '🎮' },
  { id: 'mb-z790-hero',category: 'motherboard', brand: 'ASUS',    name: 'ROG MAXIMUS Z790 HERO',     spec: 'ATX · LGA1700 · DDR5',        price: 36290, pinned: true, icon: '🧩' },
  { id: 'ram-corsair-32', category: 'ram',      brand: 'Corsair', name: 'Vengeance 32GB DDR5-6400',  spec: '2 × 16GB · CL32',             price: 9200,  pinned: true, icon: '💾' },
  { id: 'psu-hx1000i', category: 'psu',         brand: 'Corsair', name: 'HX1000i 1000W',             spec: '80+ Platinum · Fully Modular',price: 13900, pinned: true, icon: '💡' },
]

// ─── Public builds feed ────────────────────────────────────
export const builds: Build[] = [
  {
    id: 'apex-predator-v2',
    name: 'APEX PREDATOR V2',
    user: '@shadow_ripper',
    desc: 'Maxed-out 4K gaming + streaming monster.',
    tags: ['i9-13900K', 'RTX 4090', 'DDR5'],
    totalPrice: 199790,
    isPublic: true,
    views: 4200,
    favourited: true,
    icon: '🖥',
    parts: [
      { tag: 'CPU',  name: 'Intel Core i9-13900K',           sub: '24 cores · LGA1700 · 5.8GHz boost', price: 32500 },
      { tag: 'MOBO', name: 'ASUS ROG MAXIMUS Z790 HERO',     sub: 'ATX · LGA1700 · DDR5',              price: 36290 },
      { tag: 'GPU',  name: 'NVIDIA RTX 4090 Founders Edition', sub: '24GB GDDR6X · 450W TDP',          price: 94500 },
      { tag: 'RAM',  name: 'Corsair Vengeance 32GB DDR5-6400 ×2', sub: '2 × 32GB · 64GB total',         price: 12800 },
      { tag: 'PSU',  name: 'Corsair HX1000i',                sub: '1000W · 80+ Platinum · Fully Modular', price: 13900 },
      { tag: 'SSD',  name: 'Samsung 990 Pro 2TB',            sub: 'NVMe Gen4 · 7,450 MB/s',            price: 9800 },
    ],
  },
  {
    id: 'value-slayer',
    name: 'VALUE SLAYER',
    user: '@budget_king',
    desc: 'Best 1080p high-refresh build under ₱45k.',
    tags: ['Ryzen 5', 'RX 7800 XT', 'DDR5'],
    totalPrice: 42100,
    isPublic: true,
    views: 2800,
    icon: '⚡',
    parts: [],
  },
  {
    id: 'silent-storm',
    name: 'SILENT STORM',
    user: '@silent_ops',
    desc: 'Zero-noise workstation for creative pros.',
    tags: ['Ryzen 9', 'RTX 4080', 'ITX'],
    totalPrice: 146800,
    isPublic: true,
    views: 1900,
    favourited: true,
    icon: '❄',
    parts: [],
  },
  {
    id: 'neon-cascade',
    name: 'NEON CASCADE',
    user: '@neon_void',
    desc: 'RGB-loaded gaming rig with vertical GPU.',
    tags: ['i7-13700K', 'RTX 4070 Ti', 'ATX'],
    totalPrice: 95400,
    isPublic: true,
    views: 1400,
    icon: '🎮',
    parts: [],
  },
  {
    id: 'daily-driver-pro',
    name: 'DAILY DRIVER PRO',
    user: '@dev_machine',
    desc: 'Quiet code/build/test daily workhorse.',
    tags: ['i5-13600K', 'RTX 4060', '64GB'],
    totalPrice: 62300,
    isPublic: true,
    views: 980,
    icon: '💼',
    parts: [],
  },
  {
    id: 'overclock-mayhem',
    name: 'OVERCLOCK MAYHEM',
    user: '@overclock_lord',
    desc: '7800X3D pushed to 5.5GHz on custom loop.',
    tags: ['7800X3D', 'RTX 4090', 'Custom Loop'],
    totalPrice: 214500,
    isPublic: true,
    views: 3100,
    favourited: true,
    icon: '🚀',
    parts: [],
  },
]

// Look-ups used by detail pages.
export function findPart(id: string): Part | undefined {
  return parts.find(p => p.id === id)
}

export function findBuild(id: string): Build | undefined {
  return builds.find(b => b.id === id)
}

// Helper that formats a number as a PHP price (₱32,500). Kept here so
// every screen displays the same way.
export function php(n: number): string {
  return '₱' + n.toLocaleString('en-PH')
}
