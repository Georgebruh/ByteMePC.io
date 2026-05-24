<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php, type Part, type PartCategory } from '../../data/mock'
import { fetchPartsByCategory } from '../../data/catalog'

// ─── Slot definitions ─────────────────────────────────────
// Each slot maps 1:1 to a PartCategory in the catalog. Storage / case /
// cooler are not in the catalog yet — they'll get added here once their
// tables are queryable.
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
]

// Short summary label (e.g. "MB" → row tag in the summary panel) keyed
// by category so we don't restate it in the template.
const SUMMARY_TAGS: Record<PartCategory, string> = {
  cpu: 'CPU', motherboard: 'MB', gpu: 'GPU', ram: 'RAM', psu: 'PSU',
}

// ─── Selections ───────────────────────────────────────────
// One part (or null) per slot. Keyed by category, mutated when the user
// clicks a card in the picker.
const selections = ref<Record<PartCategory, Part | null>>({
  cpu: null, motherboard: null, gpu: null, ram: null, psu: null,
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

onMounted(loadActivePicker)
watch(activeSlot, loadActivePicker)

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
  }
  if (p.category === 'cpu') {
    const mb = selections.value.motherboard
    if (mb?.socket && p.socket && mb.socket !== p.socket) return `Socket ≠ ${mb.socket}`
  }
  if (p.category === 'ram') {
    const mb = selections.value.motherboard
    if (mb?.ramType && p.ramType && mb.ramType !== p.ramType) return `Needs ${mb.ramType}`
  }
  if (p.category === 'psu') {
    const need = estimatedDraw.value
    if (need && p.wattage && p.wattage < need) return `${p.wattage}W < ${need}W est.`
  }
  return null
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
    cpu: 'empty', motherboard: 'empty', gpu: 'empty', ram: 'empty', psu: 'empty',
  }
  for (const slot of slots) {
    const part = selections.value[slot.key]
    if (!part) { out[slot.key] = 'empty'; continue }
    out[slot.key] = partWarning(part) ? 'warn' : 'filled'
  }
  return out
})

function statusBracket(s: SlotStatus): string {
  return s === 'filled' ? '[OK]' : s === 'warn' ? '[!!]' : '[--]'
}

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
type CompatKind = 'ok' | 'warn' | 'pending'
interface CompatCheck { kind: CompatKind; bracket: string; text: string }

const compatChecks = computed<CompatCheck[]>(() => {
  const out: CompatCheck[] = []
  const { cpu, motherboard, gpu, ram, psu } = selections.value

  // CPU ↔ MB socket
  if (!cpu || !motherboard) {
    out.push({ kind: 'pending', bracket: '[??]', text: 'Pick a CPU + Motherboard to check socket' })
  } else if (cpu.socket && motherboard.socket && cpu.socket === motherboard.socket) {
    out.push({ kind: 'ok', bracket: '[OK]', text: `CPU socket matches MB (${cpu.socket})` })
  } else {
    out.push({ kind: 'warn', bracket: '[!!]', text: `Socket mismatch: CPU ${cpu.socket} vs MB ${motherboard.socket}` })
  }

  // RAM type ↔ MB
  if (!ram || !motherboard) {
    out.push({ kind: 'pending', bracket: '[??]', text: 'Pick a Motherboard + RAM to check memory type' })
  } else if (ram.ramType && motherboard.ramType && ram.ramType === motherboard.ramType) {
    out.push({ kind: 'ok', bracket: '[OK]', text: `RAM type ${ram.ramType} matches MB` })
  } else {
    out.push({ kind: 'warn', bracket: '[!!]', text: `RAM ${ram.ramType} doesn't match MB ${motherboard.ramType}` })
  }

  // PSU wattage vs estimated draw
  if (!gpu) {
    out.push({ kind: 'pending', bracket: '[??]', text: 'Pick a GPU to estimate power draw' })
  } else if (!psu) {
    out.push({ kind: 'pending', bracket: '[??]', text: 'Pick a PSU' })
  } else if (psu.wattage && psu.wattage >= estimatedDraw.value) {
    out.push({ kind: 'ok', bracket: '[OK]', text: `PSU ${psu.wattage}W ≥ estimated ${estimatedDraw.value}W` })
  } else {
    out.push({ kind: 'warn', bracket: '[!!]', text: `PSU ${psu.wattage}W < estimated ${estimatedDraw.value}W` })
  }

  return out
})

// Build name — editable so the page chrome reflects what the user is working on.
const buildName = ref('Untitled Build')

// Picker header line: how many compatible parts vs total in the loaded set.
const pickerCounts = computed(() => {
  const total = pickerParts.value.length
  const compatible = pickerParts.value.filter(p => !partWarning(p)).length
  return { total, compatible }
})

// Friendly title for the picker header.
const pickerHeading = computed(() => {
  const slot = slots.find(s => s.key === activeSlot.value)
  return slot ? `Choose a ${slot.label}` : 'Choose a Part'
})
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// builder · editing</span>
        <input v-model="buildName" class="title-input" spellcheck="false" />
      </div>
      <div class="header-actions">
        <button class="t-btn">Build Settings</button>
        <button class="t-btn primary">Save Build</button>
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
          :class="{ active: activeSlot === s.key }"
          @click="activeSlot = s.key"
        >
          <span class="hex-tile code">{{ s.code }}</span>
          <div class="nm">
            {{ s.label }}
            <small>{{ pickedLabel(s.key) }}</small>
          </div>
          <span class="st" :class="slotStatuses[s.key]">
            {{ statusBracket(slotStatuses[s.key]) }}
          </span>
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
              {{ pickerCounts.total }} LISTED · {{ pickerCounts.compatible }} COMPATIBLE
            </div>
          </div>
        </div>

        <div v-if="pickerLoading" class="picker-status">Loading parts…</div>
        <div v-else-if="pickerError" class="picker-status err">{{ pickerError }}</div>
        <div v-else-if="!pickerParts.length" class="picker-status">No parts available in this category.</div>

        <div v-else class="builder-grid">
          <button
            v-for="opt in pickerParts"
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
              <span v-else class="h-tag ok">Compatible</span>
            </div>
          </button>
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
          <span class="lbl">SUBTOTAL · PHP</span>
          <span class="total-val">{{ php(subtotal) }}</span>
        </div>

        <!-- Validation strip — one row per rule. -->
        <span class="kicker mute side-kicker compat-kicker">// compatibility</span>
        <div class="compat-list">
          <div v-for="c in compatChecks" :key="c.text" class="compat-row" :class="c.kind">
            <span class="bracket">{{ c.bracket }}</span>
            <span>{{ c.text }}</span>
          </div>
        </div>

        <div class="builder-actions">
          <button class="t-btn primary full">Validate &amp; Save</button>
          <button class="t-btn full">Make Public</button>
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

.header-actions { display: flex; gap: 10px; }

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
  grid-template-columns: 32px 1fr auto 26px;
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
.slot-log .st {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-align: right;
  font-weight: 700;
}
.slot-log .st.filled { color: var(--green); }
.slot-log .st.warn   { color: var(--red); }
.slot-log .st.empty  { color: var(--text-low); }
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
.compat-list {}
.compat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 11px;
  color: var(--text-dim);
}
.compat-row .bracket {
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 10px;
  flex-shrink: 0;
}
.compat-row.ok      .bracket { color: var(--green); }
.compat-row.warn    .bracket { color: var(--red); }
.compat-row.pending .bracket { color: var(--text-low); }

.builder-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
