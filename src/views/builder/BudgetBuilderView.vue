<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php, type Part, type PartCategory, type BuildPartRef } from '../../data/mock'
import { fetchPartsByCategory, fetchAllParts } from '../../data/catalog'
import { createBuild, type CreateBuildInput } from '../../data/builds'
import { useSession } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import Lebron from '../../assets/loading-screen-dark.gif'

const router = useRouter()
const { userId, isSignedIn } = useSession()

// ─── Slot definitions (1:1 with Manual Builder) ───────────
interface BuilderSlot {
  key: PartCategory
  label: string
  code: string
  // Tag returned by the edge function in `suggested[].tag` for this category.
  tag: string
}

const slots: BuilderSlot[] = [
  { key: 'cpu',         label: 'CPU',         code: 'CPU', tag: 'CPU' },
  { key: 'motherboard', label: 'Motherboard', code: 'MB',  tag: 'MOBO' },
  { key: 'gpu',         label: 'GPU',         code: 'GPU', tag: 'GPU' },
  { key: 'ram',         label: 'RAM',         code: 'RAM', tag: 'RAM' },
  { key: 'storage',     label: 'Storage',     code: 'SSD', tag: 'STORAGE' },
  { key: 'psu',         label: 'PSU',         code: 'PSU', tag: 'PSU' },
  { key: 'case',        label: 'Case',        code: 'CSE', tag: 'CASE' },
  { key: 'cooler',      label: 'CPU Cooler',  code: 'CLR', tag: 'COOLER' },
]

// ─── Per-slot mode + selection ────────────────────────────
// `mode` toggles whether the AI picks the part (auto) or the user has
// locked in a specific Part from the catalog (lock).
// `selections` holds the locked Part for each slot; ignored when in auto.
type SlotMode = 'auto' | 'lock'
const mode = ref<Record<PartCategory, SlotMode>>({
  cpu: 'auto', motherboard: 'auto', gpu: 'auto', ram: 'auto',
  storage: 'auto', psu: 'auto', case: 'auto', cooler: 'auto',
})
const selections = ref<Record<PartCategory, Part | null>>({
  cpu: null, motherboard: null, gpu: null, ram: null,
  storage: null, psu: null, case: null, cooler: null,
})

const activeSlot = ref<PartCategory>('cpu')

// ─── Budget input ─────────────────────────────────────────
// String so the input handles commas + locale formatting cleanly.
const budget = ref('120,000')
const presets: Array<{ label: string; value: string }> = [
  { label: '₱40k',  value: '40,000'  },
  { label: '₱80k',  value: '80,000'  },
  { label: '₱120k', value: '120,000' },
  { label: '₱200k', value: '200,000' },
]
function setBudgetPreset(v: string) { budget.value = v }
const budgetNumeric = computed(() => Number(budget.value.replace(/,/g, '')) || 0)

// ─── Picker data (mirrors Manual Builder) ─────────────────
const pickerParts = ref<Part[]>([])
const pickerLoading = ref(false)
const pickerError = ref<string | null>(null)
const search = ref('')
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

onMounted(loadActivePicker)

watch(activeSlot, () => {
  search.value = ''
  currentPage.value = 1
  loadActivePicker()
})

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

watch([visibleParts], () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1
})
watch(search, () => { currentPage.value = 1 })

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

// ─── Mode + pick handlers ─────────────────────────────────
function setMode(cat: PartCategory, m: SlotMode) {
  mode.value[cat] = m
  // Releasing a slot back to AI: clear the locked selection so it doesn't
  // get re-sent on the next generate.
  if (m === 'auto') selections.value[cat] = null
}

function pickPart(part: Part) {
  // Clicking the same locked card again unlocks it (back to AUTO).
  if (selections.value[part.category]?.id === part.id) {
    selections.value[part.category] = null
    mode.value[part.category] = 'auto'
    return
  }
  selections.value[part.category] = part
  mode.value[part.category] = 'lock'
}

// ─── Compat checks against other LOCKED selections ────────
// AUTO slots are unknown at this point, so they're skipped — same logic
// pattern as Manual Builder (`partWarning` simply ignores nulls).
function partWarning(p: Part): string | null {
  const s = selections.value
  if (p.category === 'motherboard') {
    if (s.cpu?.socket && p.socket && s.cpu.socket !== p.socket) return `Socket ≠ ${s.cpu.socket}`
    if (s.ram?.ramType && p.ramType && s.ram.ramType !== p.ramType) return `RAM ${s.ram.ramType}`
    if (s.case?.caseSizes?.length && p.size && !s.case.caseSizes.includes(p.size)) {
      return `${p.size} won't fit case`
    }
  }
  if (p.category === 'cpu') {
    if (s.motherboard?.socket && p.socket && s.motherboard.socket !== p.socket) return `Socket ≠ ${s.motherboard.socket}`
    if (s.cooler?.coolerSockets?.length && p.socket && !s.cooler.coolerSockets.includes(p.socket)) {
      return `Cooler ≠ ${p.socket}`
    }
  }
  if (p.category === 'ram') {
    if (s.motherboard?.ramType && p.ramType && s.motherboard.ramType !== p.ramType) return `Needs ${s.motherboard.ramType}`
  }
  if (p.category === 'case') {
    if (s.motherboard?.size && p.caseSizes?.length && !p.caseSizes.includes(s.motherboard.size)) {
      return `No ${s.motherboard.size} support`
    }
  }
  if (p.category === 'cooler') {
    if (s.cpu?.socket && p.coolerSockets?.length && !p.coolerSockets.includes(s.cpu.socket)) {
      return `No ${s.cpu.socket} mount`
    }
  }
  return null
}

function hasCompatContext(p: Part): boolean {
  const s = selections.value
  switch (p.category) {
    case 'motherboard': return !!(s.cpu || s.ram || s.case)
    case 'cpu':         return !!(s.motherboard || s.cooler)
    case 'ram':         return !!s.motherboard
    case 'case':        return !!s.motherboard
    case 'cooler':      return !!s.cpu
    default:            return false
  }
}

// ─── Counts (left rail + right rail strips) ───────────────
const lockedCount = computed(() =>
  slots.reduce((n, s) => n + (mode.value[s.key] === 'lock' ? 1 : 0), 0),
)
const autoCount = computed(() => slots.length - lockedCount.value)

// ─── Generate result (from edge function) ─────────────────
interface SuggestedPart extends BuildPartRef { id: string }
const suggested = ref<SuggestedPart[]>([])
const summary = ref({ budget: 0, total: 0, overBudget: 0, perfScore: 0 })
const isGenerating = ref(false)
const isSaving = ref(false)
const generateError = ref('')
const hasResult = computed(() => suggested.value.length > 0)

// Helper: look up the AI-picked part for a given category (after generate).
function suggestedFor(cat: PartCategory): SuggestedPart | null {
  const tag = slots.find(s => s.key === cat)?.tag
  if (!tag) return null
  return suggested.value.find(p => p.tag === tag) ?? null
}

// Status label shown under each slot in the left rail.
function slotStatusText(cat: PartCategory): string {
  if (mode.value[cat] === 'lock') {
    return selections.value[cat]?.name ?? '— pick part'
  }
  const ai = suggestedFor(cat)
  return ai?.name ?? '— AI will pick'
}

// ─── Generate ────────────────────────────────────────────
async function generatePCBuild() {
  if (!budgetNumeric.value) {
    generateError.value = 'Set a budget before generating.'
    return
  }
  generateError.value = ''
  isGenerating.value = true

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      throw new Error('You must be logged in to generate a build.')
    }

    // Build the locks payload: send the exact part the user owns, plus the
    // category tag the edge function uses to slot it into the response.
    const lockedParts = slots
      .filter(s => mode.value[s.key] === 'lock' && selections.value[s.key])
      .map(s => {
        const p = selections.value[s.key]!
        return {
          category: s.key,
          tag: s.tag,
          partId: p.id,
          name: `${p.brand} ${p.name}`,
          price: p.price,
        }
      })

    const allParts = await fetchAllParts()
    // Token trim: drop parts that swallow >80% of budget on their own.
    const sensibleParts = allParts.filter(part => part.price <= budgetNumeric.value * 0.8)

    const response = await fetch(import.meta.env.VITE_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        budget: budgetNumeric.value,
        lockedParts,
        catalog: sensibleParts,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to generate build: ${errorText}`)
    }

    const data = await response.json()
    suggested.value = data.suggested ?? []
    summary.value = data.summary ?? { budget: 0, total: 0, overBudget: 0, perfScore: 0 }
  } catch (e: any) {
    generateError.value = e?.message ?? 'Failed to generate build.'
    console.error('Generation failed:', e)
  } finally {
    isGenerating.value = false
  }
}

// ─── Save generated build ────────────────────────────────
const saveError = ref('')

async function saveGeneratedBuild() {
  saveError.value = ''
  if (!isSignedIn.value || !userId.value) {
    router.push('/sign-in')
    return
  }
  if (!hasResult.value) return
  isSaving.value = true

  try {
    const getId = (tag: string) => {
      const part = suggested.value.find(p => p.tag === tag)
      return part ? { id: part.id } : null
    }

    const payload: CreateBuildInput = {
      userId: userId.value,
      name: `Auto-Build · ${php(summary.value.total)}`,
      isPublic: false,
      cpu:         getId('CPU'),
      motherboard: getId('MOBO'),
      gpu:         getId('GPU'),
      ram:         getId('RAM'),
      storage:     getId('STORAGE'),
      psu:         getId('PSU'),
      case:        getId('CASE'),
      cooler:      getId('COOLER'),
    }

    const newBuildId = await createBuild(payload)
    router.push(`/builder/manual/${newBuildId}`)
  } catch (e: any) {
    saveError.value = e?.message ?? 'Failed to save build.'
    console.error('Failed to save:', e)
  } finally {
    isSaving.value = false
  }
}

// ─── Picker header ──────────────────────────────────────
const pickerHeading = computed(() => {
  const slot = slots.find(s => s.key === activeSlot.value)
  return slot ? `Pick a ${slot.label}` : 'Pick a Part'
})
const pickerCounts = computed(() => {
  const total = pickerParts.value.length
  const visible = visibleParts.value.length
  const compatible = visibleParts.value.filter(p => !partWarning(p)).length
  return { total, visible, compatible }
})

// Budget utilisation % (right rail meta) — capped string for the bar width.
const utilPct = computed(() => {
  if (!summary.value.budget) return 0
  return Math.round((summary.value.total / summary.value.budget) * 100)
})
const utilBarWidth = computed(() => Math.min(100, utilPct.value) + '%')

// Pre-derived references used in the template.
const activeSlotMeta = computed(() => slots.find(s => s.key === activeSlot.value)!)
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- ─── Header ─── -->
    <div class="page-header">
      <div>
        <span class="kicker">// auto · co-pilot</span>
        <div class="section-title">Budget Auto-Builder</div>
        <div class="section-sub">Lock parts you own · AI fills the rest within budget</div>
      </div>
      <RouterLink to="/builder/manual" class="t-btn">Switch to Manual <span class="arrow">→</span></RouterLink>
    </div>

    <div class="builder">
      <!-- ─── LEFT: slot rail ─── -->
      <aside class="build-side">
        <span class="kicker mute side-kicker">// components</span>

        <div class="rail-counts">
          <div class="pill locked"><strong>{{ lockedCount }}</strong>LOCKED</div>
          <div class="pill auto"><strong>{{ autoCount }}</strong>AUTO</div>
        </div>

        <button
          v-for="s in slots"
          :key="s.key"
          class="slot-log"
          :class="{
            locked: mode[s.key] === 'lock',
            'ai-filled': mode[s.key] === 'auto' && suggestedFor(s.key),
            active: activeSlot === s.key,
          }"
          @click="activeSlot = s.key"
        >
          <span class="hex-tile" :class="{ purp: mode[s.key] === 'lock' }">{{ s.code }}</span>
          <div class="nm">
            {{ s.label }}
            <small>{{ slotStatusText(s.key) }}</small>
          </div>
          <span
            class="state"
            :class="{
              locked: mode[s.key] === 'lock',
              ai: mode[s.key] === 'auto' && !!suggestedFor(s.key),
              auto: mode[s.key] === 'auto' && !suggestedFor(s.key),
            }"
          >{{
            mode[s.key] === 'lock'
              ? 'LOCK'
              : suggestedFor(s.key) ? 'AI' : 'AUTO'
          }}</span>
        </button>
      </aside>

      <!-- ─── CENTER: mode toggle + AUTO panel / LOCK picker ─── -->
      <main class="builder-main">
        <div class="head">
          <div>
            <span class="kicker mute">// configure · {{ activeSlot }}</span>
            <h2>{{ pickerHeading }}</h2>
            <div class="section-sub head-sub">
              <template v-if="mode[activeSlot] === 'lock'">
                {{ pickerCounts.visible }} / {{ pickerCounts.total }} LISTED · {{ pickerCounts.compatible }} COMPATIBLE
              </template>
              <template v-else>
                AI WILL OPTIMIZE THIS SLOT
              </template>
            </div>
          </div>
        </div>

        <!-- mode toggle for the active slot -->
        <div class="mode-toggle">
          <button
            type="button"
            :class="{ active: mode[activeSlot] === 'auto' }"
            @click="setMode(activeSlot, 'auto')"
          >
            <strong>⚡ Let AI Pick</strong>
            <small>Optimise within remaining budget</small>
          </button>
          <button
            type="button"
            class="lock"
            :class="{ active: mode[activeSlot] === 'lock' }"
            @click="setMode(activeSlot, 'lock')"
          >
            <strong>🔒 Lock Specific Part</strong>
            <small>I already own / want this exact part</small>
          </button>
        </div>

        <!-- AUTO panel -->
        <div v-if="mode[activeSlot] === 'auto'" class="auto-panel">
          <div class="glyph">⚡</div>
          <div class="ttl">AI will pick the best {{ activeSlotMeta.label }}</div>
          <div class="sub">
            Set your budget and lock the parts you already own, then hit
            <strong>Generate</strong>. The AI will fill this slot with the best
            value option that fits your remaining budget and compatibility.
          </div>
          <div class="auto-actions">
            <button class="t-btn" type="button" @click="setMode(activeSlot, 'lock')">
              Pick a specific part instead <span class="arrow">→</span>
            </button>
          </div>
          <!-- Show the AI's choice for this slot if a result exists. -->
          <div v-if="suggestedFor(activeSlot)" class="auto-suggestion">
            <span class="kicker">// last AI pick</span>
            <div class="sg-name">{{ suggestedFor(activeSlot)!.name }}</div>
            <div class="sg-sub">{{ suggestedFor(activeSlot)!.sub }}</div>
            <div class="sg-price">{{ php(suggestedFor(activeSlot)!.price) }}</div>
          </div>
        </div>

        <!-- LOCK picker (mirrors Manual Builder) -->
        <template v-else>
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
              <span v-if="selections[opt.category]?.id === opt.id" class="select-kicker">// LOCKED</span>
              <div class="name">{{ opt.brand }} {{ opt.name }}</div>
              <div class="spec">{{ opt.spec }}</div>
              <div class="foot">
                <span class="price-amber">{{ php(opt.price) }}</span>
                <span v-if="partWarning(opt)" class="h-tag warn">{{ partWarning(opt) }}</span>
                <span v-else-if="hasCompatContext(opt)" class="h-tag ok">Compatible</span>
              </div>
            </button>
          </div>

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
        </template>
      </main>

      <!-- ─── RIGHT: mission control ─── -->
      <aside class="build-summary">
        <span class="kicker mute side-kicker">// budget</span>

        <div class="budget-block">
          <div class="prompt-ln"><span class="arrow">$</span> set --budget</div>
          <div class="input-line">
            <span class="cur">PHP</span>
            <input v-model="budget" type="text" spellcheck="false" />
            <span class="caret"></span>
          </div>
          <div class="presets">
            <button
              v-for="p in presets"
              :key="p.value"
              type="button"
              class="t-btn"
              :class="{ primary: budget === p.value }"
              @click="setBudgetPreset(p.value)"
            >{{ p.label }}</button>
          </div>
        </div>

        <div class="lock-strip">
          <div class="pill locked"><strong>{{ lockedCount }}</strong>Locked</div>
          <div class="pill auto"><strong>{{ autoCount }}</strong>Auto</div>
        </div>

        <button
          class="t-btn primary full generate-btn"
          :disabled="isGenerating || !budgetNumeric"
          @click="generatePCBuild"
        >
          {{ isGenerating ? 'Generating…' : '⚡ Generate Build' }}
        </button>
        <p v-if="generateError" class="rail-err">{{ generateError }}</p>

        <img v-if="isGenerating" class="loading-screen" :src="Lebron" alt="Generating…" />

        <!-- Post-generation result -->
        <template v-if="hasResult">
          <span class="kicker mute side-kicker summary-rows-kicker">// last result</span>

          <div
            v-for="s in slots"
            :key="s.key"
            class="summary-row"
          >
            <span class="k" :class="{ locked: mode[s.key] === 'lock', ai: mode[s.key] === 'auto' }">
              {{ s.code }}
            </span>
            <span class="v" :class="{ muted: !suggestedFor(s.key) }">
              {{ suggestedFor(s.key)?.name ?? '— Not set' }}
            </span>
            <span class="p" :class="{ muted: !suggestedFor(s.key) }">
              {{ suggestedFor(s.key) ? php(suggestedFor(s.key)!.price) : '—' }}
            </span>
          </div>

          <div class="summary-total">
            <span class="lbl">TOTAL</span>
            <span class="total-val">{{ php(summary.total) }}</span>
          </div>

          <div class="util-block">
            <div class="util-row">
              <span>Budget util</span>
              <strong :class="{ warn: utilPct > 100, ok: utilPct > 0 && utilPct <= 100 }">{{ utilPct }}%</strong>
            </div>
            <div class="util-bar"><div class="util-bar-fill" :style="{ width: utilBarWidth }"></div></div>
            <div class="util-row">
              <span>Over budget</span>
              <strong :class="{ warn: summary.overBudget > 0 }">{{ summary.overBudget > 0 ? '+ ' + php(summary.overBudget) : '—' }}</strong>
            </div>
            <div class="util-row">
              <span>Est. perf score</span>
              <strong>{{ summary.perfScore.toLocaleString() }}</strong>
            </div>
            <div class="util-row">
              <span>Status</span>
              <span class="h-tag" :class="{ warn: summary.overBudget > 0, ok: summary.overBudget === 0 }">{{
                summary.overBudget > 0 ? 'Over budget' : 'Compatible'
              }}</span>
            </div>
          </div>

          <div class="builder-actions">
            <button class="t-btn full" type="button" :disabled="isGenerating" @click="generatePCBuild">Re-generate</button>
            <button
              class="t-btn primary full"
              type="button"
              :disabled="isSaving || !hasResult"
              @click="saveGeneratedBuild"
            >{{ isSaving ? 'Saving…' : 'Save Build to Profile' }}</button>
            <p v-if="saveError" class="rail-err">{{ saveError }}</p>
          </div>
        </template>

        <RouterLink to="/builder/manual" class="switch-link">
          ← Build manually instead
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

.builder {
  display: grid;
  grid-template-columns: 290px 1fr 340px;
  gap: 22px;
}

/* ─── Left rail ─── */
.build-side {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 16px;
  height: fit-content;
}
.side-kicker { display: block; margin-bottom: 12px; }

.rail-counts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 12px;
}
.rail-counts .pill {
  padding: 7px 0;
  border: 1px solid var(--line);
  text-align: center;
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.rail-counts .pill strong {
  display: inline-block;
  font-family: var(--display);
  font-size: 13px;
  margin-right: 6px;
  color: var(--text);
  letter-spacing: -0.02em;
}
.rail-counts .pill.locked { color: var(--purple); border-color: rgba(168, 85, 247, 0.35); background: rgba(168, 85, 247, 0.06); }
.rail-counts .pill.locked strong { color: var(--purple); }
.rail-counts .pill.auto { color: var(--cyan); border-color: rgba(0, 212, 255, 0.35); background: rgba(0, 212, 255, 0.06); }
.rail-counts .pill.auto strong { color: var(--cyan); }

.slot-log {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 10px;
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
.slot-log.locked.active {
  border-left-color: var(--purple);
  background: rgba(168, 85, 247, 0.08);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.slot-log.locked .nm small { color: var(--purple); }
.slot-log.ai-filled .nm small { color: var(--cyan); }
.slot-log .state {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-low);
}
.slot-log .state.auto { color: var(--text-mute); }
.slot-log .state.locked { color: var(--purple); }
.slot-log .state.ai { color: var(--cyan); }

/* ─── Center pane ─── */
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

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid var(--line);
  margin-bottom: 18px;
}
.mode-toggle button {
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-right: 1px solid var(--line);
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.mode-toggle button:last-child { border-right: none; }
.mode-toggle button:hover { background: rgba(0, 212, 255, 0.04); color: var(--text); }
.mode-toggle button strong {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: 0.08em;
}
.mode-toggle button small {
  display: block;
  font-size: 9.5px;
  color: var(--text-low);
  letter-spacing: 0.08em;
  text-transform: none;
  font-weight: 400;
}
.mode-toggle button.active {
  background: rgba(0, 212, 255, 0.06);
  color: var(--cyan);
}
.mode-toggle button.active strong { color: var(--cyan); }
.mode-toggle button.lock:hover { background: rgba(168, 85, 247, 0.05); }
.mode-toggle button.active.lock {
  background: rgba(168, 85, 247, 0.08);
  color: var(--purple);
}
.mode-toggle button.active.lock strong { color: var(--purple); }

/* AUTO panel */
.auto-panel {
  border: 1px dashed var(--line);
  padding: 32px 24px;
  text-align: center;
}
.auto-panel .glyph {
  font-family: var(--display);
  font-size: 42px;
  color: var(--cyan);
  margin-bottom: 10px;
}
.auto-panel .ttl {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: -0.015em;
}
.auto-panel .sub {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
  max-width: 460px;
  margin: 0 auto 16px;
  line-height: 1.7;
}
.auto-panel .sub strong { color: var(--cyan); font-weight: 600; }
.auto-panel .auto-actions { margin-top: 6px; }
.auto-suggestion {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
  text-align: left;
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;
}
.auto-suggestion .kicker { display: block; margin-bottom: 6px; }
.auto-suggestion .sg-name {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
}
.auto-suggestion .sg-sub {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 2px;
  letter-spacing: 0.04em;
}
.auto-suggestion .sg-price {
  font-family: var(--display);
  font-size: 18px;
  color: var(--amber);
  font-weight: 700;
  margin-top: 8px;
  letter-spacing: -0.02em;
}

/* LOCK picker (lifted from Manual Builder styles) */
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
.picker-search-input:focus { border-color: var(--purple); }
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
.comp-card:hover { border-color: var(--purple); }
.comp-card.selected {
  border-color: var(--purple);
  border-left-width: 2px;
  background: rgba(168, 85, 247, 0.06);
}
.comp-card .select-kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--purple);
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

/* Pagination — mirrors Manual / BrowseView */
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
.pg-btn:hover:not(:disabled) { border-color: var(--purple); color: var(--purple); }
.pg-btn.active {
  background: var(--purple);
  color: var(--bg);
  border-color: var(--purple);
  font-weight: 700;
}
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-ellipsis {
  color: var(--text-low);
  padding: 0 4px;
  font-family: var(--mono);
}

/* ─── Right rail (mission control) ─── */
.build-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 18px;
  height: fit-content;
  position: sticky;
  top: 80px;
}

.budget-block {
  border: 1px solid var(--line);
  padding: 14px;
  margin-bottom: 14px;
  background: rgba(0, 0, 0, 0.3);
}
.budget-block .prompt-ln {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  margin-bottom: 8px;
}
.budget-block .prompt-ln .arrow { color: var(--cyan); margin-right: 6px; }
.input-line {
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.input-line .cur {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  font-weight: 700;
}
.input-line input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding: 0;
  min-width: 0;
}
.input-line .caret {
  width: 8px;
  height: 22px;
  background: var(--cyan);
  animation: caret-blink 1.1s steps(2) infinite;
}
@keyframes caret-blink { 50% { opacity: 0; } }

.presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.presets .t-btn {
  padding: 7px 0;
  font-size: 10px;
  justify-content: center;
  letter-spacing: 0.08em;
}

.lock-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 14px;
}
.lock-strip .pill {
  padding: 8px;
  border: 1px solid var(--line);
  text-align: center;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.lock-strip .pill strong {
  display: block;
  font-family: var(--display);
  font-size: 22px;
  color: var(--text);
  margin-bottom: 2px;
  letter-spacing: -0.02em;
}
.lock-strip .pill.locked { color: var(--purple); border-color: rgba(168, 85, 247, 0.35); background: rgba(168, 85, 247, 0.06); }
.lock-strip .pill.locked strong { color: var(--purple); }
.lock-strip .pill.auto { color: var(--cyan); border-color: rgba(0, 212, 255, 0.35); background: rgba(0, 212, 255, 0.06); }
.lock-strip .pill.auto strong { color: var(--cyan); }

.generate-btn {
  padding: 14px;
  justify-content: center;
  font-size: 13px;
}

.loading-screen {
  display: block;
  width: 180px;
  margin: 14px auto;
}

.summary-rows-kicker { margin-top: 18px; margin-bottom: 8px; display: block; }
.summary-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 8px;
  align-items: baseline;
  padding: 7px 0;
  border-top: 1px dashed var(--line);
  font-size: 11px;
}
.summary-row:first-of-type { border-top: none; padding-top: 0; }
.summary-row .k {
  color: var(--text-low);
  letter-spacing: 0.1em;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 9.5px;
}
.summary-row .k.locked { color: var(--purple); }
.summary-row .k.ai { color: var(--cyan); }
.summary-row .v { color: var(--text); letter-spacing: 0.02em; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-row .v.muted { color: var(--text-low); }
.summary-row .p {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 12px;
  letter-spacing: -0.015em;
  white-space: nowrap;
}
.summary-row .p.muted { color: var(--text-low); }

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

.util-block {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--mono);
  font-size: 11px;
}
.util-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}
.util-row strong {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.015em;
}
.util-row strong.ok { color: var(--green); }
.util-row strong.warn { color: var(--red); }
.util-bar {
  height: 4px;
  background: rgba(0, 212, 255, 0.08);
  position: relative;
  overflow: hidden;
}
.util-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--cyan), var(--purple));
  transition: width 0.4s ease;
}

.builder-actions {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rail-err {
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
