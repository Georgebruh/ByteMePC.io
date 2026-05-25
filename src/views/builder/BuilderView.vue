<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php, type Part, type PartCategory } from '../../data/mock'
import { fetchPartsByCategory } from '../../data/catalog'
import { createBuild, updateBuild, fetchBuildById } from '../../data/builds'
import { useSession } from '../../lib/session'

const router = useRouter()
const route = useRoute()
const { userId, isSignedIn } = useSession()

// Edit mode = a build_id is in the URL. When present, we pre-populate
// every slot, name, and visibility from the DB and persist via updateBuild.
const editingId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? id : null
})

// ─── Slot definitions ─────────────────────────────────────
// Each slot maps 1:1 to a PartCategory in the catalog. Storage is
// not in the catalog yet — it'll get added here once its tables are
// queryable.
interface BuilderSlot {
  key: PartCategory
  label: string
  code: string
}

const slots: BuilderSlot[] = [
  { key: 'cpu',         label: 'CPU',         code: 'CPU' },
  { key: 'motherboard', label: 'Motherboard', code: 'MB'  },
  { key: 'gpu',         label: 'GPU',         code: 'GPU' },
  { key: 'ram',         label: 'RAM',         code: 'RAM' },
  { key: 'psu',         label: 'PSU',         code: 'PSU' },
  { key: 'case',        label: 'Case',        code: 'CSE' },
  { key: 'cooler',      label: 'CPU Cooler',  code: 'CLR' },
]

// Short summary label (e.g. "MB" → row tag in the summary panel) keyed
// by category so we don't restate it in the template.
const SUMMARY_TAGS: Record<PartCategory, string> = {
  cpu: 'CPU', motherboard: 'MB', gpu: 'GPU', ram: 'RAM', psu: 'PSU', case: 'CSE', cooler: 'CLR',
}

// ─── Selections ───────────────────────────────────────────
// One part (or null) per slot. Keyed by category, mutated when the user
// clicks a card in the picker.
const selections = ref<Record<PartCategory, Part | null>>({
  cpu: null, motherboard: null, gpu: null, ram: null, psu: null, case: null, cooler: null,
})

// Currently active slot — drives which catalog category the picker shows.
const activeSlot = ref<PartCategory>('cpu')

// ─── Picker data ──────────────────────────────────────────
// Parts for the active category, plus loading / error state. We refetch
// on slot change rather than caching every category up-front, mirroring
// BrowseView's pattern.
const pickerParts = ref<Part[]>([])
const pickerLoading = ref(false)
const pickerError = ref<string | null>(null)

// Search query — clears when switching slots so the new category starts clean.
const search = ref('')

// ─── Pagination (fixed page size; same shape as BrowseView) ───
const PAGE_SIZE = 6
const currentPage = ref(1)

async function loadActivePicker() {
  pickerLoading.value = true
  pickerError.value = null
  try {
    pickerParts.value = await fetchPartsByCategory(activeSlot.value)
  } catch (e) {
    pickerError.value = e instanceof Error ? e.message : 'Failed to load parts.'
    pickerParts.value = []
  } finally {
    pickerLoading.value = false
  }
}

// ─── Load existing build (edit mode) ──────────────────────
// Pre-populate every slot from the saved build. Maps each part row in
// the loaded Build back onto the catalog Part shape by tag, fetching
// the catalog for each category we have a part in. Once selections are
// set, the rest of the builder (compat checks, picker selection
// highlighting) works identically to the create flow.
const editLoading = ref(false)

const TAG_TO_CATEGORY: Record<string, PartCategory> = {
  CPU: 'cpu', MOBO: 'motherboard', GPU: 'gpu',
  RAM: 'ram', PSU: 'psu', CASE: 'case', COOLER: 'cooler',
}

async function loadExistingBuild(id: string) {
  editLoading.value = true
  try {
    const b = await fetchBuildById(id, userId.value)
    if (!b) return

    buildName.value = b.name
    isPublic.value = b.isPublic

    // For each part on the build, find its matching catalog row so we
    // get a full Part object (with compat-checkable fields like socket,
    // ramType, etc.) rather than just the display strings on BuildPartRef.
    const cats = new Set<PartCategory>()
    for (const p of b.parts) {
      const c = TAG_TO_CATEGORY[p.tag]
      if (c) cats.add(c)
    }
    const catalogs = await Promise.all(
      [...cats].map(async c => [c, await fetchPartsByCategory(c)] as const),
    )
    const byCat = new Map<PartCategory, Part[]>(catalogs)

    for (const p of b.parts) {
      const c = TAG_TO_CATEGORY[p.tag]
      if (!c) continue
      const catalog = byCat.get(c) ?? []
      // Match on the catalog row whose name appears at the start of the
      // build part's display name (the build name strips brand-only
      // prefixes — e.g. "Intel Core i9-13900K" vs "Core i9-13900K").
      const match = catalog.find(cp => p.name.includes(cp.name))
        ?? catalog.find(cp => cp.name.includes(stripQty(p.name)))
      if (match) selections.value[c] = match
    }
  } finally {
    editLoading.value = false
  }
}

// "Corsair Vengeance 32GB ×2" -> "Corsair Vengeance 32GB"
function stripQty(name: string): string {
  return name.replace(/\s*×\s*\d+\s*$/, '').trim()
}

onMounted(async () => {
  await loadActivePicker()
  if (editingId.value) await loadExistingBuild(editingId.value)
})

// Re-load when navigating between new / edit, or between different edit ids.
watch(editingId, async (id) => {
  if (id) {
    await loadExistingBuild(id)
  } else {
    // Switched back to "new" mode — reset everything.
    buildName.value = 'Untitled Build'
    isPublic.value = false
    for (const k of Object.keys(selections.value) as PartCategory[]) {
      selections.value[k] = null
    }
  }
})

watch(activeSlot, () => {
  search.value = ''
  currentPage.value = 1
  loadActivePicker()
})

// Parts after the search filter — matches on name + brand, case-insensitive.
const visibleParts = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return pickerParts.value
  return pickerParts.value.filter(p =>
    p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(visibleParts.value.length / PAGE_SIZE)))
const pagedParts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return visibleParts.value.slice(start, start + PAGE_SIZE)
})

// Snap back to page 1 whenever the visible set shrinks below the current
// page, or whenever the user types in the search box.
watch([visibleParts], () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1
})
watch(search, () => { currentPage.value = 1 })

// Compact 1 … cur-1 cur cur+1 … last list with ellipses.
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

function pickPart(part: Part) {
  // Clicking the already-selected card deselects (lets the user empty a slot).
  const current = selections.value[part.category]
  selections.value[part.category] = current?.id === part.id ? null : part
}

// ─── Per-part compatibility check (used to badge picker cards) ───
// Returns null when the part is fine, or a short reason when it isn't.
function partWarning(p: Part): string | null {
  if (p.category === 'motherboard') {
    const cpu = selections.value.cpu
    if (cpu?.socket && p.socket && cpu.socket !== p.socket) return `Socket ≠ ${cpu.socket}`
    const ram = selections.value.ram
    if (ram?.ramType && p.ramType && ram.ramType !== p.ramType) return `RAM ${ram.ramType}`
    const pcCase = selections.value.case
    if (pcCase?.caseSizes?.length && p.size && !pcCase.caseSizes.includes(p.size)) {
      return `${p.size} won't fit case`
    }
  }
  if (p.category === 'cpu') {
    const mb = selections.value.motherboard
    if (mb?.socket && p.socket && mb.socket !== p.socket) return `Socket ≠ ${mb.socket}`
    const cooler = selections.value.cooler
    if (cooler?.coolerSockets?.length && p.socket && !cooler.coolerSockets.includes(p.socket)) {
      return `Cooler ≠ ${p.socket}`
    }
  }
  if (p.category === 'ram') {
    const mb = selections.value.motherboard
    if (mb?.ramType && p.ramType && mb.ramType !== p.ramType) return `Needs ${mb.ramType}`
  }
  if (p.category === 'psu') {
    const need = estimatedDraw.value
    if (need && p.wattage && p.wattage < need) return `${p.wattage}W < ${need}W est.`
  }
  if (p.category === 'case') {
    const mb = selections.value.motherboard
    if (mb?.size && p.caseSizes?.length && !p.caseSizes.includes(mb.size)) {
      return `No ${mb.size} support`
    }
  }
  if (p.category === 'cooler') {
    const cpu = selections.value.cpu
    if (cpu?.socket && p.coolerSockets?.length && !p.coolerSockets.includes(cpu.socket)) {
      return `No ${cpu.socket} mount`
    }
  }
  return null
}

// True when at least one *other* part the picker card depends on is
// already selected — i.e. there's actually something to compare against.
// Used to suppress the green "Compatible" tag when no comparison has
// been performed yet (otherwise we'd be claiming "compatible" against
// nothing).
function hasCompatContext(p: Part): boolean {
  const s = selections.value
  switch (p.category) {
    case 'motherboard': return !!(s.cpu || s.ram || s.case)
    case 'cpu':         return !!(s.motherboard || s.cooler)
    case 'ram':         return !!s.motherboard
    case 'psu':         return !!s.gpu
    case 'case':        return !!s.motherboard
    case 'cooler':      return !!s.cpu
    default:            return false
  }
}

// ─── Power budget ────────────────────────────────────────
// Rough draw used by the PSU compat check + sidebar warning. Sum of
// GPU TDP + a flat headroom for CPU/board/storage/fans.
const SYSTEM_OVERHEAD_W = 200

const estimatedDraw = computed(() => {
  const gpu = selections.value.gpu
  if (!gpu?.tdp) return 0
  return gpu.tdp + SYSTEM_OVERHEAD_W
})

// ─── Derived slot statuses for the left rail ─────────────
type SlotStatus = 'filled' | 'empty' | 'warn'

const slotStatuses = computed<Record<PartCategory, SlotStatus>>(() => {
  const out: Record<PartCategory, SlotStatus> = {
    cpu: 'empty', motherboard: 'empty', gpu: 'empty', ram: 'empty', psu: 'empty', case: 'empty', cooler: 'empty',
  }
  for (const slot of slots) {
    const part = selections.value[slot.key]
    if (!part) { out[slot.key] = 'empty'; continue }
    out[slot.key] = partWarning(part) ? 'warn' : 'filled'
  }
  return out
})

// Short label shown under each slot's label in the rail.
function pickedLabel(cat: PartCategory): string {
  const p = selections.value[cat]
  return p ? p.name : '— pick one'
}

// ─── Summary panel (right column) ────────────────────────
const summary = computed(() =>
  slots.map(slot => {
    const part = selections.value[slot.key]
    const warn = part ? !!partWarning(part) : false
    return {
      cat: slot.key,
      label: SUMMARY_TAGS[slot.key],
      value: part?.name ?? '— Not set',
      price: part ? php(part.price) : '—',
      muted: !part,
      warn,
    }
  }),
)

const subtotal = computed(() =>
  slots.reduce((sum, s) => sum + (selections.value[s.key]?.price ?? 0), 0),
)

// ─── Compatibility rules (sidebar list) ──────────────────
// Each row has a consistent shape: a short label (left, like a column tag)
// and a detail string (right, the actual result). This lets the rail render
// as a real two-column list instead of a wall of variable-length prose.
type CompatKind = 'ok' | 'warn' | 'pending'
interface CompatCheck { kind: CompatKind; label: string; detail: string }

const compatChecks = computed<CompatCheck[]>(() => {
  const out: CompatCheck[] = []
  const { cpu, motherboard, gpu, ram, psu, case: pcCase, cooler } = selections.value

  // CPU ↔ MB socket
  if (!cpu || !motherboard) {
    out.push({ kind: 'pending', label: 'Socket', detail: 'pick CPU + MB' })
  } else if (cpu.socket && motherboard.socket && cpu.socket === motherboard.socket) {
    out.push({ kind: 'ok', label: 'Socket', detail: `${cpu.socket} matched` })
  } else {
    out.push({ kind: 'warn', label: 'Socket', detail: `CPU ${cpu.socket} ≠ MB ${motherboard.socket}` })
  }

  // RAM type ↔ MB
  if (!ram || !motherboard) {
    out.push({ kind: 'pending', label: 'Memory', detail: 'pick MB + RAM' })
  } else if (ram.ramType && motherboard.ramType && ram.ramType === motherboard.ramType) {
    out.push({ kind: 'ok', label: 'Memory', detail: `${ram.ramType} matched` })
  } else {
    out.push({ kind: 'warn', label: 'Memory', detail: `RAM ${ram.ramType} ≠ MB ${motherboard.ramType}` })
  }

  // Form factor: MB ↔ Case
  if (!motherboard || !pcCase) {
    out.push({ kind: 'pending', label: 'Form factor', detail: 'pick MB + case' })
  } else if (motherboard.size && pcCase.caseSizes?.length && pcCase.caseSizes.includes(motherboard.size)) {
    out.push({ kind: 'ok', label: 'Form factor', detail: `${motherboard.size} fits case` })
  } else {
    out.push({ kind: 'warn', label: 'Form factor', detail: `case won't fit ${motherboard.size}` })
  }

  // Cooler ↔ CPU socket
  if (!cpu || !cooler) {
    out.push({ kind: 'pending', label: 'Cooler', detail: 'pick CPU + cooler' })
  } else if (cpu.socket && cooler.coolerSockets?.length && cooler.coolerSockets.includes(cpu.socket)) {
    out.push({ kind: 'ok', label: 'Cooler', detail: `mounts on ${cpu.socket}` })
  } else {
    out.push({ kind: 'warn', label: 'Cooler', detail: `no ${cpu.socket} mount` })
  }

  // PSU wattage vs estimated draw. Wattages get <strong> so the load-bearing
  // number pops out of the rail — see v-html note on .compat-detail below.
  if (!gpu) {
    out.push({ kind: 'pending', label: 'Power', detail: 'pick GPU to estimate' })
  } else if (!psu) {
    out.push({ kind: 'pending', label: 'Power', detail: `pick PSU (need <strong>~${estimatedDraw.value}W</strong>)` })
  } else if (psu.wattage && psu.wattage >= estimatedDraw.value) {
    out.push({ kind: 'ok', label: 'Power', detail: `<strong>${psu.wattage}W</strong> ≥ <strong>~${estimatedDraw.value}W</strong>` })
  } else {
    out.push({ kind: 'warn', label: 'Power', detail: `<strong>${psu.wattage}W</strong> &lt; <strong>~${estimatedDraw.value}W</strong>` })
  }

  return out
})

// One-line verdict above the list — what the user reads first.
interface CompatSummary { kind: CompatKind; glyph: string; text: string; ok: number; warn: number; pending: number }
const compatSummary = computed<CompatSummary>(() => {
  const counts = { ok: 0, warn: 0, pending: 0 }
  for (const c of compatChecks.value) counts[c.kind]++
  const total = compatChecks.value.length
  if (counts.warn > 0) {
    return { kind: 'warn', glyph: '✗', text: `${counts.warn} issue${counts.warn === 1 ? '' : 's'} — fix to validate`, ...counts }
  }
  if (counts.pending > 0) {
    return { kind: 'pending', glyph: '○', text: `${counts.ok}/${total} checks · ${counts.pending} pending`, ...counts }
  }
  return { kind: 'ok', glyph: '✓', text: 'All checks pass — build is compatible', ...counts }
})

function glyphFor(kind: CompatKind): string {
  return kind === 'ok' ? '✓' : kind === 'warn' ? '✗' : '○'
}

// Build name — editable so the page chrome reflects what the user is working on.
const buildName = ref('Untitled Build')

// Picker header line: how many compatible parts vs total in the visible
// (post-search) set, plus the raw catalog total for context.
const pickerCounts = computed(() => {
  const total = pickerParts.value.length
  const visible = visibleParts.value.length
  const compatible = visibleParts.value.filter(p => !partWarning(p)).length
  return { total, visible, compatible }
})

// Friendly title for the picker header.
const pickerHeading = computed(() => {
  const slot = slots.find(s => s.key === activeSlot.value)
  return slot ? `Choose a ${slot.label}` : 'Choose a Part'
})

// ─── Save flow ────────────────────────────────────────────
// `isPublic` is toggled by the Make Public button — it's the same flag
// the DB persists on the builds row. `saveError` surfaces failure to the
// user; `saving` disables the button while the request is in flight.
const isPublic = ref(false)
const saving = ref(false)
const saveError = ref('')

// At least one slot has a part picked. We don't block saving on the
// compat checks themselves (a draft is fine to save), but we won't let
// the user save an empty form.
const hasAnySelection = computed(() =>
  slots.some(s => selections.value[s.key] !== null),
)

async function saveBuild() {
  saveError.value = ''
  if (!isSignedIn.value || !userId.value) {
    // Bounce to sign-in; user can return and re-pick. State is local
    // so it'll reset — acceptable for v1.
    router.push('/sign-in')
    return
  }
  if (!hasAnySelection.value) {
    saveError.value = 'Pick at least one part before saving.'
    return
  }

  const payload = {
    name: buildName.value.trim() || 'Untitled Build',
    isPublic: isPublic.value,
    cpu:         selections.value.cpu,
    motherboard: selections.value.motherboard,
    gpu:         selections.value.gpu,
    psu:         selections.value.psu,
    case:        selections.value.case,
    cooler:      selections.value.cooler,
    ram:         selections.value.ram,
  }

  saving.value = true
  try {
    if (editingId.value) {
      // Update path — stay on the edit page so the user can keep tweaking.
      await updateBuild(editingId.value, payload)
      router.push(`/builds/${editingId.value}`)
    } else {
      // Create path — navigate to the new build's detail screen.
      const newId = await createBuild({ userId: userId.value, ...payload })
      router.push(`/builds/${newId}`)
    }
  } catch (e: any) {
    saveError.value = e?.message ?? 'Failed to save build.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">{{ editingId ? '// builder · editing existing build' : '// builder · new build' }}</span>
        <input v-model="buildName" class="title-input" spellcheck="false" />
      </div>
    </div>

    <div class="builder">

      <!-- ─── Slot terminal log (left) ─── -->
      <aside class="build-side">
        <span class="kicker mute side-kicker">// components</span>
        <button
          v-for="(s, i) in slots"
          :key="s.key"
          class="slot-log"
          :class="[slotStatuses[s.key], { active: activeSlot === s.key }]"
          @click="activeSlot = s.key"
        >
          <span class="hex-tile code">{{ s.code }}</span>
          <div class="nm">
            {{ s.label }}
            <small>{{ pickedLabel(s.key) }}</small>
          </div>
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
        </button>
      </aside>

      <!-- ─── Picker grid (centre) ─── -->
      <main class="builder-main">
        <div class="head">
          <div>
            <span class="kicker mute">// pick · {{ activeSlot }}</span>
            <h2>{{ pickerHeading }}</h2>
            <div class="section-sub head-sub">
              {{ pickerCounts.visible }} / {{ pickerCounts.total }} LISTED · {{ pickerCounts.compatible }} COMPATIBLE
            </div>
          </div>
        </div>

        <div class="picker-search">
          <input
            v-model="search"
            type="text"
            class="picker-search-input"
            :placeholder="`Search ${activeSlot}…`"
            spellcheck="false"
          />
          <button
            v-if="search"
            type="button"
            class="picker-search-clear"
            @click="search = ''"
            aria-label="Clear search"
          >×</button>
        </div>

        <div v-if="pickerLoading" class="picker-status">Loading parts…</div>
        <div v-else-if="pickerError" class="picker-status err">{{ pickerError }}</div>
        <div v-else-if="!pickerParts.length" class="picker-status">No parts available in this category.</div>
        <div v-else-if="!visibleParts.length" class="picker-status">No matches for "{{ search }}".</div>

        <div v-else class="builder-grid">
          <button
            v-for="opt in pagedParts"
            :key="opt.id"
            type="button"
            class="comp-card"
            :class="{ selected: selections[opt.category]?.id === opt.id }"
            @click="pickPart(opt)"
          >
            <span v-if="selections[opt.category]?.id === opt.id" class="select-kicker">// SELECTED</span>
            <div class="name">{{ opt.brand }} {{ opt.name }}</div>
            <div class="spec">{{ opt.spec }}</div>
            <div class="foot">
              <span class="price-amber">{{ php(opt.price) }}</span>
              <span v-if="partWarning(opt)" class="h-tag warn">{{ partWarning(opt) }}</span>
              <span v-else-if="hasCompatContext(opt)" class="h-tag ok">Compatible</span>
            </div>
          </button>
        </div>

        <!-- Pagination — kept visible (even at 1 page) so the controls
             don't pop in/out as the user searches. -->
        <div v-if="!pickerLoading && !pickerError && pickerParts.length" class="pagination">
          <div class="pg-controls">
            <button
              type="button"
              class="pg-btn"
              :disabled="currentPage === 1 || totalPages === 1"
              @click="currentPage--"
            >‹ Prev</button>

            <template v-for="(item, i) in pageItems" :key="i">
              <span v-if="item === 'ellipsis'" class="pg-ellipsis">…</span>
              <button
                v-else
                type="button"
                class="pg-btn"
                :class="{ active: item === currentPage }"
                :disabled="totalPages === 1"
                @click="currentPage = item"
              >{{ item }}</button>
            </template>

            <button
              type="button"
              class="pg-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >Next ›</button>
          </div>
        </div>
      </main>

      <!-- ─── Build summary (right) ─── -->
      <aside class="build-summary">
        <span class="kicker mute side-kicker">// current build</span>

        <div v-for="s in summary" :key="s.cat" class="summary-row">
          <span class="k">{{ s.label }}</span>
          <span class="v" :class="{ muted: s.muted, warn: s.warn }">{{ s.value }}</span>
          <span class="p" :class="{ muted: s.muted, warn: s.warn }">{{ s.price }}</span>
        </div>

        <div class="summary-total">
          <span class="lbl">SUBTOTAL</span>
          <span class="total-val">{{ php(subtotal) }}</span>
        </div>

        <!-- Validation strip — one row per rule. Each row leads with a
             status glyph + a short label so the rail scans top-to-bottom
             without needing to read full sentences. Verdict band above the
             list is the at-a-glance answer. -->
        <span class="kicker mute side-kicker compat-kicker">// compatibility</span>

        <div class="compat-summary" :class="compatSummary.kind">
          <span class="compat-summary-glyph">{{ compatSummary.glyph }}</span>
          <span class="compat-summary-text">{{ compatSummary.text }}</span>
        </div>

        <div class="compat-list">
          <div
            v-for="c in compatChecks"
            :key="c.label"
            class="compat-row"
            :class="c.kind"
          >
            <span class="compat-glyph">{{ glyphFor(c.kind) }}</span>
            <span class="compat-label">{{ c.label }}</span>
            <!-- Detail strings are author-controlled (built from local
                 numeric data), so <strong> in the source is safe. -->
            <span class="compat-detail" v-html="c.detail"></span>
          </div>
        </div>

        <div class="builder-actions">
          <button
            class="t-btn primary full"
            :disabled="saving || !hasAnySelection || editLoading"
            @click="saveBuild"
          >{{
            saving
              ? (editingId ? 'Updating…' : 'Saving…')
              : !isSignedIn
                ? 'Sign In to Save'
                : editingId
                  ? 'Update Build'
                  : 'Save Build'
          }}</button>
          <button
            class="t-btn full"
            :class="{ active: isPublic }"
            @click="isPublic = !isPublic"
            type="button"
          >{{ isPublic ? '✓ Public' : 'Make Public' }}</button>
          <p v-if="saveError" class="save-err">{{ saveError }}</p>
        </div>

        <!-- Quick link to the budget auto-builder. -->
        <RouterLink to="/builder/auto" class="switch-link">
          ⚡ Try the budget auto-builder →
        </RouterLink>
      </aside>
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
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
}

/* Inline-editable build title — looks like the static h1 above did. */
.title-input {
  font-family: var(--display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: var(--text);
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  outline: none;
  padding: 0 0 2px;
  margin: 0;
  min-width: 320px;
}
.title-input:hover  { border-bottom-color: var(--line); }
.title-input:focus  { border-bottom-color: var(--cyan); }

/* Picker placeholder row (loading / error / empty). */
.picker-status {
  padding: 32px 16px;
  text-align: center;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  border: 1px dashed var(--line);
}
.picker-status.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

/* Picker search input — full-width, sits above the grid. */
.picker-search {
  position: relative;
  margin-bottom: 14px;
}
.picker-search-input {
  width: 100%;
  padding: 11px 36px 11px 14px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  outline: none;
  transition: border-color 0.15s;
}
.picker-search-input::placeholder {
  color: var(--text-low);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
}
.picker-search-input:focus { border-color: var(--cyan); }
.picker-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s;
}
.picker-search-clear:hover { color: var(--red); }

/* ─── Pagination (mirrors BrowseView) ─── */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 22px;
  padding: 14px 0 0;
  border-top: 1px dashed var(--line);
}
.pg-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.pg-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
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

.builder {
  display: grid;
  grid-template-columns: 290px 1fr 320px;
  gap: 22px;
}

/* ─── Slot terminal log ─── */
.build-side {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 16px;
  height: fit-content;
}
.side-kicker { display: block; margin-bottom: 12px; }

.slot-log {
  display: grid;
  grid-template-columns: 32px 1fr 26px;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-bottom: 1px dashed var(--line);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  font-family: var(--mono);
  transition: background 0.15s;
}
.slot-log:last-child { border-bottom: none; }
.slot-log:hover { background: rgba(0, 212, 255, 0.04); }
.slot-log.active {
  background: rgba(0, 212, 255, 0.06);
  border-left: 2px solid var(--cyan);
  padding-left: 8px;
}
/* Whole row goes red when the picked part is incompatible — no badge,
   just a clear visual flag. Active state still wins on the left border. */
.slot-log.warn {
  background: rgba(255, 70, 85, 0.06);
}
.slot-log.warn:hover { background: rgba(255, 70, 85, 0.1); }
.slot-log.warn.active {
  background: rgba(255, 70, 85, 0.1);
  border-left-color: var(--red);
}
.slot-log.warn .nm,
.slot-log.warn .nm small { color: var(--red); }

.slot-log .code {
  width: 30px;
  height: 22px;
  font-size: 9px;
  letter-spacing: 0.12em;
}
.slot-log .nm {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0.04em;
}
.slot-log .nm small {
  display: block;
  font-size: 9.5px;
  color: var(--text-low);
  font-weight: 400;
  margin-top: 2px;
  letter-spacing: 0.06em;
}
.slot-log .idx {
  font-size: 9.5px;
  color: var(--text-low);
  letter-spacing: 0.16em;
  text-align: right;
}

/* ─── Picker (centre column) ─── */
.builder-main {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 22px;
}
.builder-main .head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}
.builder-main h2 {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-top: 4px;
}
.head-sub { margin: 4px 0 0; }

.builder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.comp-card {
  position: relative;
  background: rgba(5, 8, 16, 0.7);
  border: 1px solid var(--line);
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: var(--mono);
  color: inherit;
  text-align: left;
  width: 100%;
}
.comp-card:hover { border-color: var(--cyan); }
.comp-card.selected {
  border-color: var(--cyan);
  border-left-width: 2px;
  background: rgba(0, 212, 255, 0.04);
}
.comp-card .select-kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--cyan);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.comp-card .name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
  margin-bottom: 6px;
}
.comp-card .spec {
  font-size: 11px;
  color: var(--text-mute);
  line-height: 1.5;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}
.comp-card .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.price-amber {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 15px;
  letter-spacing: -0.015em;
}
.meta-extra { font-size: 10.5px; color: var(--text-mute); letter-spacing: 0.06em; }

/* ─── Build summary (right column) ─── */
.build-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 18px;
  height: fit-content;
  position: sticky;
  top: 80px;
}

.summary-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: baseline;
  padding: 7px 0;
  border-top: 1px dashed var(--line);
  font-size: 11.5px;
}
.summary-row:first-of-type { border-top: none; padding-top: 0; }
.summary-row .k {
  color: var(--text-low);
  letter-spacing: 0.06em;
  font-weight: 500;
}
.summary-row .v { color: var(--text); letter-spacing: 0.02em; }
.summary-row .v.muted { color: var(--text-low); }
.summary-row .v.warn  { color: var(--red); }
.summary-row .p {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 12px;
  letter-spacing: -0.015em;
}
.summary-row .p.muted { color: var(--text-low); }
.summary-row .p.warn  { color: var(--red); }

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 0 0;
  margin-top: 10px;
  border-top: 1px solid var(--cyan);
}
.summary-total .lbl {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-mute);
  letter-spacing: 0.18em;
}
.summary-total .total-val {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.025em;
}

.compat-kicker { margin-top: 18px; margin-bottom: 8px; }

/* Verdict band — colored block that announces the overall state before the
   user scans the rule list. Worst-state-wins (warn > pending > ok). */
.compat-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}
.compat-summary-glyph {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
.compat-summary-text { color: var(--text-dim); }
.compat-summary.ok {
  border-color: rgba(110, 231, 183, 0.4);
  background: rgba(110, 231, 183, 0.08);
}
.compat-summary.ok .compat-summary-glyph,
.compat-summary.ok .compat-summary-text { color: var(--green); }
.compat-summary.warn {
  border-color: rgba(255, 70, 85, 0.45);
  background: rgba(255, 70, 85, 0.1);
}
.compat-summary.warn .compat-summary-glyph,
.compat-summary.warn .compat-summary-text { color: var(--red); }
.compat-summary.pending {
  border-color: var(--line);
}
.compat-summary.pending .compat-summary-glyph { color: var(--text-mute); }

/* Rows render as glyph · LABEL · detail — a three-column grid keeps labels
   left-aligned so the eye can vertically scan the rule names. */
.compat-row {
  display: grid;
  grid-template-columns: 16px 70px 1fr;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  border-left: 2px solid transparent;
  margin-bottom: 2px;
}
.compat-glyph {
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
  text-align: center;
}
.compat-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 10px;
  color: var(--text-low);
}
.compat-detail { color: var(--text-dim); }
/* Bold numerals inside a detail (e.g. power wattages) — amber so the
   load-bearing number is the first thing the eye lands on. Warn rows
   override the colour below so it stays inside the red palette. */
.compat-detail strong {
  color: var(--amber);
  font-weight: 700;
  font-family: var(--display);
  letter-spacing: -0.01em;
}

.compat-row.ok .compat-glyph { color: var(--green); }
.compat-row.pending .compat-glyph { color: var(--text-mute); }
.compat-row.pending .compat-detail { color: var(--text-low); }

/* Warn rows keep the red shade so actual problems jump out. */
.compat-row.warn {
  background: rgba(255, 70, 85, 0.08);
  border-left-color: var(--red);
}
.compat-row.warn .compat-glyph,
.compat-row.warn .compat-label,
.compat-row.warn .compat-detail { color: var(--red); }
.compat-row.warn .compat-detail strong { color: var(--red); }

.builder-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* Public-toggle pill — when active, mirror the primary button's filled
   style so the user can see the build is going out publicly. */
.builder-actions .t-btn.active {
  background: var(--purple);
  border-color: var(--purple);
  color: var(--bg);
  font-weight: 700;
}
.save-err {
  margin-top: 6px;
  padding: 8px 10px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--red);
  background: rgba(255, 70, 85, 0.08);
  border: 1px solid rgba(255, 70, 85, 0.35);
  letter-spacing: 0.04em;
}

.switch-link {
  display: block;
  margin-top: 14px;
  text-align: center;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--cyan);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .builder { grid-template-columns: 1fr; }
  .build-summary { position: static; }
}
</style>
