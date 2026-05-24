<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppNav from '../../components/AppNav.vue'
import PartCard from '../../components/PartCard.vue'
import type { Part, PartCategory } from '../../data/mock'
import { php } from '../../data/mock'
import { fetchCategoryCounts, fetchPartsByCategory } from '../../data/catalog'

// Categories shown in the sidebar — the old segmented tabs row was folded
// into the filter sidebar so the left column owns the entire chrome.
const categories: Array<{ key: PartCategory; label: string }> = [
  { key: 'cpu',         label: 'CPU' },
  { key: 'motherboard', label: 'Motherboard' },
  { key: 'gpu',         label: 'GPU' },
  { key: 'ram',         label: 'RAM' },
  { key: 'psu',         label: 'PSU' },
]

const activeCat = ref<PartCategory>('cpu')
const search = ref('')

const categoryCounts = ref<Record<PartCategory, number>>({
  cpu: 0, motherboard: 0, gpu: 0, ram: 0, psu: 0,
})
const totalCount = computed(() =>
  Object.values(categoryCounts.value).reduce((sum, n) => sum + n, 0),
)

// Parts for the active category, plus loading / error state for the grid.
const tabParts = ref<Part[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function loadActiveCat() {
  loading.value = true
  errorMsg.value = null
  try {
    tabParts.value = await fetchPartsByCategory(activeCat.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to load parts.'
    tabParts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadActiveCat()
  try {
    categoryCounts.value = await fetchCategoryCounts()
  } catch {
    // Sidebar counts are cosmetic — leave them at 0 if the count query fails.
  }
})

watch(activeCat, () => {
  // Switching category clears filter state + bounces back to page 1.
  selectedBrands.value = {}
  selectedSockets.value = {}
  coresMin.value = null
  coresMax.value = null
  priceMin.value = null
  priceMax.value = null
  currentPage.value = 1
  loadActiveCat()
})

// ─── Filters (live — checkbox change applies immediately) ───
const selectedBrands = ref<Record<string, boolean>>({})
const selectedSockets = ref<Record<string, boolean>>({})
const coresMin = ref<number | null>(null)
const coresMax = ref<number | null>(null)
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)

// Unique brand list with real counts, derived from the active category's data.
const brandOptions = computed(() => {
  const map = new Map<string, number>()
  for (const p of tabParts.value) map.set(p.brand, (map.get(p.brand) ?? 0) + 1)
  return [...map.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.brand.localeCompare(b.brand))
})

// Sockets only exist on CPU + Motherboard rows. The list (and counts) come
// straight from the data so we never show a socket nobody offers.
const socketOptions = computed(() => {
  const map = new Map<string, number>()
  for (const p of tabParts.value) {
    if (!p.socket) continue
    map.set(p.socket, (map.get(p.socket) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([socket, count]) => ({ socket, count }))
    .sort((a, b) => a.socket.localeCompare(b.socket))
})

const showSocketFilter = computed(() => socketOptions.value.length > 0)
const showCoresFilter  = computed(() => activeCat.value === 'cpu')

// Helper: predicate matches a part against the current filter state.
function matchesFilters(p: Part): boolean {
  // Search bar (name / brand)
  const q = search.value.trim().toLowerCase()
  if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false

  // Brand checkboxes — only active when at least one box is ticked.
  const activeBrands = Object.entries(selectedBrands.value).filter(([, v]) => v).map(([k]) => k)
  if (activeBrands.length && !activeBrands.includes(p.brand)) return false

  // Socket checkboxes
  const activeSockets = Object.entries(selectedSockets.value).filter(([, v]) => v).map(([k]) => k)
  if (activeSockets.length && (!p.socket || !activeSockets.includes(p.socket))) return false

  // Numeric ranges — applied only when a bound is set.
  if (coresMin.value != null && (p.cores ?? 0) < coresMin.value) return false
  if (coresMax.value != null && (p.cores ?? Infinity) > coresMax.value) return false
  if (priceMin.value != null && p.price < priceMin.value) return false
  if (priceMax.value != null && p.price > priceMax.value) return false

  return true
}

// ─── Sorting ───
type SortMode = 'popular' | 'price-asc' | 'price-desc' | 'name'
const sortMode = ref<SortMode>('popular')
const sortLabels: Record<SortMode, string> = {
  'popular':    'Popular',
  'price-asc':  'Price ↑',
  'price-desc': 'Price ↓',
  'name':       'Name A–Z',
}

const filteredParts = computed(() => tabParts.value.filter(matchesFilters))

const sortedParts = computed(() => {
  const arr = [...filteredParts.value]
  switch (sortMode.value) {
    case 'price-asc':  return arr.sort((a, b) => a.price - b.price)
    case 'price-desc': return arr.sort((a, b) => b.price - a.price)
    case 'name':       return arr.sort((a, b) => a.name.localeCompare(b.name))
    default:           return arr // popular = insertion order
  }
})

// ─── Pagination (6 cards per page, fixed) ───
const PAGE_SIZE = 6
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(sortedParts.value.length / PAGE_SIZE)))
const pagedParts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedParts.value.slice(start, start + PAGE_SIZE)
})
// 1-indexed bounds of the current page, clamped to the result count
// so the "Showing X–Y of Z" label never lies (e.g. last page being short).
const pageStartIndex = computed(() =>
  sortedParts.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1,
)
const pageEndIndex = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, sortedParts.value.length),
)

// Any time the result set shrinks, snap the page back into range.
watch([filteredParts, sortMode], () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1
})

// Scroll the grid into view on page change so the user isn't left
// staring at row 3 after clicking "next". Skip on initial mount.
const gridEl = ref<HTMLElement | null>(null)
watch(currentPage, (_, prev) => {
  if (prev === undefined) return
  gridEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

// Compact page-number list with ellipses (1 … current-1, current, current+1 … last).
const pageItems = computed<Array<number | 'ellipsis'>>(() => {
  const last = totalPages.value
  const cur = currentPage.value
  if (last <= 6) return Array.from({ length: last }, (_, i) => i + 1)
  const set = new Set<number>([1, last, cur - 1, cur, cur + 1])
  const sorted = [...set].filter(n => n >= 1 && n <= last).sort((a, b) => a - b)
  const out: Array<number | 'ellipsis'> = []
  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push('ellipsis')
    out.push(n)
    prev = n
  }
  return out
})

// ─── Applied-filter chips ───
interface Chip { key: string; label: string; clear: () => void }
const appliedChips = computed<Chip[]>(() => {
  const chips: Chip[] = []
  for (const [brand, on] of Object.entries(selectedBrands.value)) {
    if (on) chips.push({
      key: `brand:${brand}`,
      label: `Brand · ${brand}`,
      clear: () => { selectedBrands.value = { ...selectedBrands.value, [brand]: false } },
    })
  }
  for (const [socket, on] of Object.entries(selectedSockets.value)) {
    if (on) chips.push({
      key: `socket:${socket}`,
      label: `Socket · ${socket}`,
      clear: () => { selectedSockets.value = { ...selectedSockets.value, [socket]: false } },
    })
  }
  if (coresMin.value != null || coresMax.value != null) {
    chips.push({
      key: 'cores',
      label: `Cores · ${coresMin.value ?? '–'}–${coresMax.value ?? '–'}`,
      clear: () => { coresMin.value = null; coresMax.value = null },
    })
  }
  if (priceMin.value != null || priceMax.value != null) {
    chips.push({
      key: 'price',
      label: `Price · ${priceMin.value != null ? php(priceMin.value) : '–'} – ${priceMax.value != null ? php(priceMax.value) : '–'}`,
      clear: () => { priceMin.value = null; priceMax.value = null },
    })
  }
  return chips
})

function clearFilters() {
  search.value = ''
  selectedBrands.value = {}
  selectedSockets.value = {}
  coresMin.value = null
  coresMax.value = null
  priceMin.value = null
  priceMax.value = null
  currentPage.value = 1
}

// Pin toggle handled at the grid level so the card itself stays stateless.
function togglePin(id: string) {
  const part = tabParts.value.find(p => p.id === id)
  if (part) part.pinned = !part.pinned
}

// Singular label used in the search placeholder + results count.
const catLabel = computed(() => categories.find(c => c.key === activeCat.value)?.label ?? '')
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- Header (ticker + segmented tabs are gone — both folded away) -->
    <div class="page-header">
      <div>
        <span class="kicker">// catalog · {{ totalCount.toLocaleString('en-PH') }} components</span>
        <div class="section-title">Browse Parts</div>
        <div class="section-sub">5 categories · live database</div>
      </div>
    </div>

    <!-- Two-column: filter sidebar owns the LEFT, content on the RIGHT. -->
    <div class="catalog">

      <!-- ───── LEFT: Filter sidebar (sticky, full left column) ───── -->
      <aside class="filters">
        <div class="filters-head">
          <span class="kicker mute">// filters</span>
        </div>

        <!-- Category — replaces the old segmented tabs. -->
        <div class="filter-group">
          <label class="field-label">Category</label>
          <div class="cat-list">
            <button
              v-for="c in categories"
              :key="c.key"
              class="cat-row"
              :class="{ active: activeCat === c.key }"
              @click="activeCat = c.key"
            >
              <span>{{ c.label }}</span>
              <span class="count">{{ categoryCounts[c.key] }}</span>
            </button>
          </div>
        </div>

        <!-- Brand (dynamic, real counts derived from the loaded data) -->
        <div v-if="brandOptions.length" class="filter-group">
          <label class="field-label">Brand</label>
          <label v-for="b in brandOptions" :key="b.brand" class="check-row">
            <input type="checkbox" v-model="selectedBrands[b.brand]" />
            {{ b.brand }}
            <span class="count">{{ b.count }}</span>
          </label>
        </div>

        <!-- Socket (CPU + Motherboard only) -->
        <div v-if="showSocketFilter" class="filter-group">
          <label class="field-label">Socket</label>
          <label v-for="s in socketOptions" :key="s.socket" class="check-row">
            <input type="checkbox" v-model="selectedSockets[s.socket]" />
            {{ s.socket }}
            <span class="count">{{ s.count }}</span>
          </label>
        </div>

        <!-- Cores (CPU only) -->
        <div v-if="showCoresFilter" class="filter-group">
          <label class="field-label">Cores</label>
          <div class="range">
            <input v-model.number="coresMin" type="number" placeholder="Min" />
            <input v-model.number="coresMax" type="number" placeholder="Max" />
          </div>
        </div>

        <div class="filter-group">
          <label class="field-label">Price (PHP)</label>
          <div class="range">
            <input v-model.number="priceMin" type="number" placeholder="₱ Min" />
            <input v-model.number="priceMax" type="number" placeholder="₱ Max" />
          </div>
        </div>

        <!-- Clear lives INSIDE the box now. -->
        <div class="filter-actions">
          <button class="t-btn full" @click="clearFilters">Clear Filters</button>
        </div>
      </aside>

      <!-- ───── RIGHT: search + results bar + chips + grid + pagination ───── -->
      <div class="content">
        <div class="search-bar">
          <input
            v-model="search"
            class="input"
            :placeholder="`🔍  Search ${catLabel}s by name, brand…`"
          />
        </div>

        <div class="results-bar">
          <div class="count-label">
            Showing <b>{{ filteredParts.length }}</b>
            results from total <em>{{ tabParts.length }}</em>
            for <b>&quot;{{ catLabel }}&quot;</b>
          </div>
          <label class="sort-select">
            Sort:
            <select v-model="sortMode">
              <option v-for="(label, mode) in sortLabels" :key="mode" :value="mode">{{ label }}</option>
            </select>
          </label>
        </div>

        <div class="chips" v-if="appliedChips.length">
          <span class="chips-label">Applied filters:</span>
          <span v-for="chip in appliedChips" :key="chip.key" class="chip">
            {{ chip.label }}
            <button type="button" title="Remove" @click="chip.clear()">×</button>
          </span>
        </div>

        <div class="parts-grid" ref="gridEl">
          <template v-if="loading">
            <div class="empty-state">
              <div class="ic" style="font-size:40px;margin-bottom:12px">⏳</div>
              Loading parts…
            </div>
          </template>
          <template v-else-if="errorMsg">
            <div class="empty-state error">
              <div class="ic" style="font-size:40px;margin-bottom:12px">⚠</div>
              Couldn't load parts.
              <div class="err-detail">{{ errorMsg }}</div>
            </div>
          </template>
          <template v-else>
            <PartCard
              v-for="p in pagedParts"
              :key="p.id"
              :part="p"
              @toggle-pin="togglePin"
            />
            <div v-if="!pagedParts.length" class="empty-state">
              <div class="ic" style="font-size:40px;margin-bottom:12px">🔍</div>
              No matching parts. Try clearing the filters.
            </div>
          </template>
        </div>

        <!-- Pagination — always visible (so the page-size selector and
             range label stay reachable even when there's only one page). -->
        <div v-if="!loading && !errorMsg" class="pagination">
          <span class="pg-range">
            <template v-if="sortedParts.length">
              Showing <b>{{ pageStartIndex }}</b>–<b>{{ pageEndIndex }}</b>
              of <b>{{ sortedParts.length }}</b>
            </template>
            <template v-else>No results</template>
          </span>

          <div class="pg-controls">
            <button
              class="pg-btn"
              :disabled="currentPage === 1 || totalPages === 1"
              @click="currentPage--"
            >‹ Prev</button>

            <template v-for="(item, i) in pageItems" :key="i">
              <span v-if="item === 'ellipsis'" class="pg-ellipsis">…</span>
              <button
                v-else
                class="pg-btn"
                :class="{ active: item === currentPage }"
                :disabled="totalPages === 1"
                @click="currentPage = item"
              >{{ item }}</button>
            </template>

            <button
              class="pg-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >Next ›</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.page-header .kicker { display: block; margin-bottom: 6px; }
.section-title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 4px;
}
.section-sub {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-low);
}

/* ─── Two-column body ─── */
.catalog {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 22px;
  align-items: start;
}

/* ─── Filter sidebar: owns the entire left column ─── */
.filters {
  background: rgba(10, 18, 32, 0.55);
  border: 1px solid var(--line);
  padding: 22px 20px;
  position: sticky;
  top: 24px;
}
.filters-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--line);
}
.filters-head .kicker { margin-bottom: 0; }

.filter-group {
  padding: 16px 0;
  border-top: 1px dashed var(--line);
}
.filter-group:first-of-type { border-top: none; padding-top: 6px; }

/* Category list — what used to be the segmented tabs row up top. */
.cat-list { display: flex; flex-direction: column; gap: 2px; }
.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.cat-row:hover { color: var(--text); border-color: var(--line); }
.cat-row.active {
  color: var(--bg);
  background: var(--cyan);
  border-color: var(--cyan);
  font-weight: 700;
}
.cat-row .count { font-size: 10px; letter-spacing: 0.1em; opacity: 0.7; }
.cat-row.active .count { opacity: 1; }

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
}
.check-row input { accent-color: var(--cyan); }
.check-row .count {
  margin-left: auto;
  color: var(--text-low);
  font-size: 10px;
  letter-spacing: 0.1em;
}

/* Grid (not flex) so each input is exactly 1fr — flex inputs refuse
   to shrink below their intrinsic width and spill outside the sidebar. */
.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.range input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px;
  font-family: var(--mono);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 0;
  /* Hide the number-input spinner buttons that eat horizontal space. */
  -moz-appearance: textfield;
  appearance: textfield;
}
.range input::-webkit-outer-spin-button,
.range input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.range input:focus {
  outline: none;
  border-color: var(--cyan);
}

.filter-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

/* ─── Right column ─── */
.content { min-width: 0; }
.search-bar { display: flex; gap: 12px; margin-bottom: 12px; }
.search-bar .input { flex: 1; }

.results-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin-bottom: 12px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}
.results-bar .count-label { text-transform: uppercase; }
.results-bar .count-label b { color: var(--text); font-weight: 500; }
.results-bar .count-label em { color: var(--cyan); font-style: normal; }
.sort-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.4);
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.sort-select select {
  background: transparent;
  color: var(--text);
  border: none;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  outline: none;
}
.sort-select select option { background: var(--bg-2); color: var(--text); }

/* Applied-filter chips */
.chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin-bottom: 22px;
}
.chips-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-right: 4px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 10px;
  border: 1px solid rgba(0, 212, 255, 0.25);
  background: rgba(0, 212, 255, 0.06);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cyan);
}
.chip button {
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: var(--cyan);
  cursor: pointer;
  font-family: var(--mono);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.65;
  padding: 0;
}
.chip button:hover { opacity: 1; color: var(--red); }

/* Grid */
.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  align-content: start;
}
.parts-grid > .empty-state { grid-column: 1 / -1; }
.empty-state.error { color: var(--red); }
.empty-state .err-detail {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.04em;
}

/* Pagination — three-zone bar: range label · page buttons · size selector */
.parts-grid { scroll-margin-top: 24px; }
.pagination {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 14px 0;
  border-top: 1px dashed var(--line);
}
/* Empty trailing column keeps the page buttons centered now that the
   "6 per page" label is gone. */
.pagination::after { content: ''; }
.pg-range {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-low);
  justify-self: start;
}
.pg-range b { color: var(--text); font-weight: 500; }
.pg-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.pg-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.15s;
}
.pg-btn:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); }
.pg-btn.active {
  background: var(--cyan);
  color: var(--bg);
  border-color: var(--cyan);
  font-weight: 700;
}
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-ellipsis {
  color: var(--text-low);
  padding: 0 4px;
  font-family: var(--mono);
}

@media (max-width: 1100px) {
  .catalog { grid-template-columns: 1fr; }
  .filters { position: static; }
  .parts-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 700px) {
  /* Stack the pagination bar so the range, controls, and selector each
     get their own row instead of fighting for horizontal space. */
  .pagination { grid-template-columns: 1fr; }
  .pg-range { justify-self: center; }
}
@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
}
</style>
