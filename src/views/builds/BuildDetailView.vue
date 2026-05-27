<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import type { Build, BuildPartRef } from '../../data/mock'
import { php } from '../../data/mock'
import { fetchBuildById, toggleFavourite, updateBuildVisibility } from '../../data/builds'
import { useSession } from '../../lib/session'

const route = useRoute()
const { userId } = useSession()

const build = ref<Build | null>(null)
const loading = ref(true)
const errorMsg = ref('')

// Toggle between the schematic UML diagram and the 3D viewer placeholder.
type ViewMode = 'schematic' | '3d'
const mode = ref<ViewMode>('schematic')

async function load() {
  const id = String(route.params.id)
  loading.value = true
  errorMsg.value = ''
  try {
    build.value = await fetchBuildById(id, userId.value)
    if (!build.value) errorMsg.value = 'Build not found.'
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load build.'
  } finally {
    loading.value = false
  }
}

// Back-link target derived from the ?from= query the listing pages set.
// Defaults to Community so deep-linked builds (shared URLs, refreshes
// without a referrer) still have a sane back path.
const backLink = computed(() => {
  switch (route.query.from) {
    case 'my-builds':  return { path: '/builds',     label: 'My Builds' }
    case 'favourites': return { path: '/favourites', label: 'Favourites' }
    default:           return { path: '/community',  label: 'Community' }
  }
})

onMounted(load)
watch(() => route.params.id, load)
watch(userId, load)

// Eight fixed UML positions — each tag has a stable slot on the diagram.
const UML_SLOTS: Array<{ tag: string; label: string; pos: string }> = [
  { tag: 'PSU',     label: 'Power',       pos: 'n-psu' },
  { tag: 'MOBO',    label: 'Motherboard', pos: 'n-mobo' },
  { tag: 'CPU',     label: 'CPU',         pos: 'n-cpu' },
  { tag: 'COOLER',  label: 'Cooler',      pos: 'n-cool' },
  { tag: 'RAM',     label: 'Memory',      pos: 'n-ram' },
  { tag: 'GPU',     label: 'Graphics',    pos: 'n-gpu' },
  { tag: 'STORAGE', label: 'Storage',     pos: 'n-stor' },
  { tag: 'CASE',    label: 'Case',        pos: 'n-case' },
]

interface Slot {
  tag: string
  label: string
  pos: string
  part?: BuildPartRef
}

const slots = computed<Slot[]>(() => {
  const parts = build.value?.parts ?? []
  return UML_SLOTS.map(s => ({
    ...s,
    part: parts.find(p => p.tag === s.tag),
  }))
})

const filledCount = computed(() => slots.value.filter(s => s.part).length)

// ─── Compatibility (mirrors BuilderView's compatChecks) ───
// BuildPartRef now carries the structured fields the Builder uses
// (socket, ramType, size, caseSizes, coolerSockets, tdp, wattage),
// so the same cross-part checks run here against the saved build.
function partFor(tag: string): BuildPartRef | undefined {
  return build.value?.parts.find(p => p.tag === tag)
}

type CompatKind = 'ok' | 'warn' | 'pending'
interface CompatCheck { kind: CompatKind; label: string; detail: string }

// Same overhead the builder uses on top of GPU TDP to estimate draw.
const SYSTEM_OVERHEAD_W = 200

const estimatedDraw = computed(() => {
  const gpu = partFor('GPU')
  if (!gpu?.tdp) return 0
  return gpu.tdp + SYSTEM_OVERHEAD_W
})

const compatChecks = computed<CompatCheck[]>(() => {
  const out: CompatCheck[] = []
  if (!build.value) return out

  const cpu    = partFor('CPU')
  const mobo   = partFor('MOBO')
  const ram    = partFor('RAM')
  const gpu    = partFor('GPU')
  const psu    = partFor('PSU')
  const pcCase = partFor('CASE')
  const cooler = partFor('COOLER')

  // CPU ↔ MB socket
  if (!cpu || !mobo) {
    out.push({ kind: 'pending', label: 'Socket', detail: 'missing CPU + MB' })
  } else if (cpu.socket && mobo.socket && cpu.socket === mobo.socket) {
    out.push({ kind: 'ok', label: 'Socket', detail: `${cpu.socket} matched` })
  } else {
    out.push({ kind: 'warn', label: 'Socket', detail: `CPU ${cpu.socket ?? '?'} ≠ MB ${mobo.socket ?? '?'}` })
  }

  // RAM type ↔ MB
  if (!ram || !mobo) {
    out.push({ kind: 'pending', label: 'Memory', detail: 'missing MB + RAM' })
  } else if (ram.ramType && mobo.ramType && ram.ramType === mobo.ramType) {
    out.push({ kind: 'ok', label: 'Memory', detail: `${ram.ramType} matched` })
  } else {
    out.push({ kind: 'warn', label: 'Memory', detail: `RAM ${ram.ramType ?? '?'} ≠ MB ${mobo.ramType ?? '?'}` })
  }

  // Form factor: MB ↔ Case
  if (!mobo || !pcCase) {
    out.push({ kind: 'pending', label: 'Form factor', detail: 'missing MB + case' })
  } else if (mobo.size && pcCase.caseSizes?.includes(mobo.size)) {
    out.push({ kind: 'ok', label: 'Form factor', detail: `${mobo.size} fits case` })
  } else {
    out.push({ kind: 'warn', label: 'Form factor', detail: `case won't fit ${mobo.size ?? '?'}` })
  }

  // Cooler ↔ CPU socket
  if (!cpu || !cooler) {
    out.push({ kind: 'pending', label: 'Cooler', detail: 'missing CPU + cooler' })
  } else if (cpu.socket && cooler.coolerSockets?.includes(cpu.socket)) {
    out.push({ kind: 'ok', label: 'Cooler', detail: `mounts on ${cpu.socket}` })
  } else {
    out.push({ kind: 'warn', label: 'Cooler', detail: `no ${cpu.socket ?? '?'} mount` })
  }

  // PSU wattage vs estimated draw
  if (!gpu) {
    out.push({ kind: 'pending', label: 'Power', detail: 'no GPU to estimate' })
  } else if (!psu) {
    out.push({ kind: 'pending', label: 'Power', detail: `missing PSU (~${estimatedDraw.value}W)` })
  } else if (psu.wattage && psu.wattage >= estimatedDraw.value) {
    out.push({ kind: 'ok', label: 'Power', detail: `${psu.wattage}W ≥ ~${estimatedDraw.value}W` })
  } else {
    out.push({ kind: 'warn', label: 'Power', detail: `${psu.wattage ?? '?'}W < ~${estimatedDraw.value}W` })
  }

  return out
})

interface CompatSummary { kind: CompatKind; glyph: string; text: string }
const compatSummary = computed<CompatSummary>(() => {
  const counts = { ok: 0, warn: 0, pending: 0 }
  for (const c of compatChecks.value) counts[c.kind]++
  const total = compatChecks.value.length
  if (counts.warn > 0) {
    return { kind: 'warn', glyph: '✗', text: `${counts.warn} issue${counts.warn === 1 ? '' : 's'} flagged` }
  }
  if (counts.pending > 0) {
    return { kind: 'pending', glyph: '○', text: `${counts.ok}/${total} checks · ${counts.pending} pending` }
  }
  return { kind: 'ok', glyph: '✓', text: 'All checks pass — build is compatible' }
})

function glyphFor(kind: CompatKind): string {
  return kind === 'ok' ? '✓' : kind === 'warn' ? '✗' : '○'
}

// PSU draw bar, anchored to the real estimate.
const psuWatts = computed(() => partFor('PSU')?.wattage ?? null)
const drawPct = computed(() => {
  if (!psuWatts.value || !estimatedDraw.value) return 0
  return Math.min(100, Math.round((estimatedDraw.value / psuWatts.value) * 100))
})

async function onToggleFav() {
  if (!userId.value || !build.value) return
  const newState = await toggleFavourite(
    userId.value,
    build.value.id,
    !!build.value.favourited,
  )
  build.value.favourited = newState
}

function onExportPdf() {
  window.print()
}

function onFork() {
  // Stub for now — wired up alongside the builder pre-fill flow.
  console.log('Fork build', build.value?.id)
}

// Owner-only visibility toggle. The pill on the title block doubles as
// the trigger when the viewer owns this build — one click flips public
// ↔ private through a minimal update path so the bug class of full
// updateBuild silently dropping is_public is bypassed.
const isOwner = computed(() =>
  !!userId.value && !!build.value?.ownerUserId && userId.value === build.value.ownerUserId,
)
const togglingVisibility = ref(false)
const visibilityError = ref('')

async function onToggleVisibility() {
  if (!isOwner.value || !build.value || togglingVisibility.value) return
  togglingVisibility.value = true
  visibilityError.value = ''
  const target = !build.value.isPublic
  try {
    await updateBuildVisibility(build.value.id, target)
    build.value.isPublic = target
  } catch (e: any) {
    visibilityError.value = e?.message ?? 'Failed to update visibility.'
  } finally {
    togglingVisibility.value = false
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink :to="backLink.path">{{ backLink.label }}</RouterLink>
      <span>/</span>
      {{ build?.name ?? '…' }}
    </div>

    <div v-if="loading" class="empty-state">Loading build…</div>
    <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

    <template v-else-if="build">
      <!-- ───── above the fold: viewer + meta ───── -->
      <section class="overview">
        <div class="viewer-card">
          <div class="viewer-tabs">
            <button
              class="tab-btn"
              :class="{ active: mode === 'schematic' }"
              @click="mode = 'schematic'"
            >Schematic</button>
            <button
              class="tab-btn"
              :class="{ active: mode === '3d' }"
              @click="mode = '3d'"
            >3D</button>
            <span class="grow" />
            <span class="meta">
              {{ filledCount }} / {{ UML_SLOTS.length }} slots ·
              <span :class="`compat-meta ${compatSummary.kind}`">{{ compatSummary.glyph }} {{ compatSummary.text }}</span>
            </span>
          </div>

          <div class="viewer-body">
            <!-- ── schematic (UML) ── -->
            <div v-if="mode === 'schematic'" class="sch">
              <div class="sch-stage">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path class="trace" d="M 16 47 L 34 47" />
                  <path class="trace" d="M 50 44 C 56 44, 56 14, 62 14" />
                  <path class="trace" d="M 76 14 L 88 14" />
                  <path class="trace" d="M 50 47 L 62 47" />
                  <path class="trace" d="M 50 50 C 56 50, 56 82, 62 82" />
                  <path class="trace" d="M 42 42 C 42 28, 42 18, 42 14" />
                  <path class="trace" d="M 42 52 C 42 64, 42 76, 42 82" />
                  <path class="trace" d="M 12 52 C 12 70, 12 82, 62 82" />
                </svg>

                <div
                  v-for="s in slots"
                  :key="s.tag"
                  class="node"
                  :class="[s.pos, { empty: !s.part }]"
                >
                  <div class="ntag">{{ s.label }}</div>
                  <template v-if="s.part">
                    <div class="nname">{{ s.part.name }}</div>
                    <div class="nsub">{{ s.part.sub }}</div>
                  </template>
                  <template v-else>
                    <div class="nname empty-name">— {{ s.label }} —</div>
                  </template>
                </div>
              </div>
            </div>

            <!-- ── 3D placeholder ── -->
            <div v-else class="coming">
              <div class="stack">
                <div class="wire">
                  <div class="face f1"></div>
                  <div class="face f2"></div>
                  <div class="face f3"></div>
                  <div class="face f4"></div>
                  <div class="face f5"></div>
                  <div class="face f6"></div>
                </div>
                <div class="big">3D Viewer Coming Soon<span class="blink"></span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="meta-card">
          <div class="title-block">
            <div class="head">
              <h1>{{ build.name }}</h1>
              <button
                v-if="isOwner"
                type="button"
                class="pill clickable"
                :class="{ private: !build.isPublic }"
                :disabled="togglingVisibility"
                :title="build.isPublic ? 'Click to make Private' : 'Click to make Public'"
                @click="onToggleVisibility"
              >
                {{ togglingVisibility ? '…' : (build.isPublic ? 'Public' : 'Private') }}
              </button>
              <span v-else class="pill" :class="{ private: !build.isPublic }">
                {{ build.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            <div class="author"><b>{{ build.user }}</b></div>
            <p v-if="visibilityError" class="vis-err">{{ visibilityError }}</p>
          </div>

          <div class="total-block">
            <div class="lbl">Total · PHP</div>
            <div class="val">{{ php(build.totalPrice) }}</div>
            <div class="parts">{{ build.parts.length }} parts</div>
          </div>

          <div v-if="build.tags?.length" class="tag-row">
            <span v-for="t in build.tags" :key="t" class="tg">{{ t }}</span>
          </div>

          <div class="action-row">
            <button class="btn primary span-2" @click="onExportPdf">Export PDF</button>
            <button
              class="btn"
              :class="{ on: build.favourited }"
              :disabled="!userId"
              :title="userId ? '' : 'Sign in to favourite'"
              @click="onToggleFav"
            >{{ build.favourited ? '♥ Favourited' : '♥ Favourite' }}</button>
            <button class="btn" @click="onFork">⑂ Fork Build</button>
          </div>

          <div class="panel">
            <h4>Compatibility</h4>

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
                <span class="compat-detail">{{ c.detail }}</span>
              </div>
            </div>

            <div v-if="psuWatts" class="power-bar">
              <div class="fill" :style="{ width: drawPct + '%' }" />
            </div>
            <div v-if="psuWatts" class="power-bar-lbl">est. {{ drawPct }}% of supply</div>
          </div>
        </div>
      </section>

      <!-- ───── below the fold: components ───── -->
      <section class="parts-wrap">
        <h2>Components</h2>
        <table class="parts-table">
          <thead>
            <tr>
              <th class="ct">Slot</th>
              <th>Component</th>
              <th style="text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in build.parts" :key="p.tag + p.name">
              <td class="ct">{{ p.tag }}</td>
              <td>
                <div class="cn">{{ p.name }}</div>
                <div class="cs">{{ p.sub }}</div>
              </td>
              <td class="cp">{{ php(p.price) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-row">
          <span class="k">Total</span>
          <span class="v">{{ php(build.totalPrice) }}</span>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.breadcrumb {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
}

/* ── overview (above the fold) ── */
.overview {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 1fr);
  gap: 22px;
  height: calc(100vh - 200px);
  min-height: 560px;
}

/* viewer card */
.viewer-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
}
.viewer-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.55);
}
.tab-btn {
  padding: 7px 14px;
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.tab-btn:hover {
  background: rgba(0, 212, 255, 0.05);
  border-color: rgba(0, 212, 255, 0.35);
}
.tab-btn.active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
.viewer-tabs .grow { flex: 1; }
.viewer-tabs .meta {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-mute);
}

.viewer-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── schematic (UML) ── */
.sch { position: absolute; inset: 0; padding: 18px 22px; }
.sch-stage { position: relative; height: 100%; }
.sch-stage svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.trace {
  fill: none;
  stroke: rgba(0, 212, 255, 0.5);
  stroke-width: 1.4;
  stroke-dasharray: 4 5;
  animation: flow 1.4s linear infinite;
}
@keyframes flow { to { stroke-dashoffset: -18; } }

.node {
  position: absolute;
  background: rgba(10, 18, 32, 0.92);
  border: 1px solid var(--line);
  padding: 9px 12px;
  min-width: 148px;
  max-width: 180px;
  font-family: var(--mono);
}
.node .ntag {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
  font-weight: 700;
}
.node .nname {
  font-family: var(--display);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.25;
  margin-top: 3px;
}
.node .nsub {
  font-size: 9.5px;
  color: var(--text-mute);
  margin-top: 2px;
}
.node.empty {
  background: rgba(10, 18, 32, 0.4);
  border-style: dashed;
}
.node.empty .ntag { color: var(--text-low); }
.node.empty .empty-name {
  color: var(--text-low);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.n-psu  { left: 4%;  top: 42%; }
.n-mobo { left: 34%; top: 42%; }
.n-cpu  { left: 62%; top: 8%;  }
.n-cool { left: 88%; top: 8%; min-width: 0; max-width: 110px; }
.n-ram  { left: 62%; top: 42%; }
.n-gpu  { left: 62%; top: 76%; }
.n-stor { left: 34%; top: 8%;  }
.n-case { left: 34%; top: 76%; }

/* ── 3D coming soon ── */
.coming {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.coming .stack { text-align: center; font-family: var(--mono); }

.wire {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 22px;
  transform-style: preserve-3d;
  animation: spin 14s linear infinite;
}
@keyframes spin { to { transform: rotateY(360deg) rotateX(-12deg); } }
.wire .face {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(0, 212, 255, 0.45);
  background: rgba(0, 212, 255, 0.02);
}
.wire .f1 { transform: rotateY(0deg)    translateZ(90px); }
.wire .f2 { transform: rotateY(90deg)   translateZ(90px); }
.wire .f3 { transform: rotateY(180deg)  translateZ(90px); }
.wire .f4 { transform: rotateY(-90deg)  translateZ(90px); }
.wire .f5 { transform: rotateX(90deg)   translateZ(90px); }
.wire .f6 { transform: rotateX(-90deg)  translateZ(90px); }

.coming .big {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cyan);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 0 22px rgba(0, 212, 255, 0.5);
}
.coming .blink {
  display: inline-block;
  width: 8px;
  height: 14px;
  background: var(--cyan);
  margin-left: 4px;
  vertical-align: -2px;
  animation: cbl 1s steps(1) infinite;
}
@keyframes cbl { 50% { opacity: 0; } }

/* ── meta column ── */
.meta-card { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.title-block {
  padding: 18px 20px;
  border: 1px solid var(--line);
  background: rgba(10, 18, 32, 0.6);
}
.title-block .head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.title-block h1 {
  font-family: var(--display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--text);
}
.title-block .author {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
}
.title-block .author b {
  color: var(--cyan);
  font-weight: 500;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border: 1px solid rgba(34, 211, 168, 0.35);
  background: rgba(34, 211, 168, 0.06);
  color: var(--green);
  white-space: nowrap;
}
.pill::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
}
.pill.private {
  border-color: rgba(85, 119, 170, 0.4);
  background: rgba(85, 119, 170, 0.06);
  color: var(--text-mute);
}
.pill.private::before {
  background: var(--text-mute);
  box-shadow: none;
}
/* Owner-clickable variant — a real button rendered inside the title row.
   Resets the default button chrome so it stays visually identical to the
   span, then layers in a hover/disabled state for the interactive feel. */
button.pill {
  cursor: pointer;
  font-family: var(--mono);
}
button.pill:hover:not(:disabled) {
  filter: brightness(1.2);
}
button.pill:disabled {
  opacity: 0.55;
  cursor: progress;
}

.vis-err {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--red);
}

.total-block {
  padding: 14px 20px;
  border: 1px solid var(--line);
  background: rgba(0, 212, 255, 0.04);
}
.total-block .lbl {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.total-block .val {
  font-family: var(--display);
  font-size: 30px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.025em;
  line-height: 1;
  margin-top: 4px;
}
.total-block .parts {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 5px;
}

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tg {
  display: inline-block;
  padding: 3px 8px;
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.25);
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--cyan);
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.action-row .span-2 { grid-column: 1 / -1; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.btn:hover {
  border-color: rgba(0, 212, 255, 0.4);
  background: rgba(0, 212, 255, 0.05);
}
.btn.primary {
  background: var(--cyan);
  color: var(--bg);
  border-color: var(--cyan);
  font-weight: 700;
}
.btn.primary:hover { background: #2ddfff; }
.btn.on {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.45);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn:disabled:hover {
  border-color: var(--line);
  background: transparent;
}

/* compatibility panel */
.panel {
  padding: 16px 18px;
  border: 1px solid var(--line);
  background: rgba(10, 18, 32, 0.6);
}
.panel h4 {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 10px;
}
/* Verdict band — worst-state-wins colour above the row list. */
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
.compat-summary.pending { border-color: var(--line); }
.compat-summary.pending .compat-summary-glyph { color: var(--text-mute); }

.compat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.compat-row {
  display: grid;
  grid-template-columns: 16px 80px 1fr;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  border-left: 2px solid transparent;
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
.compat-row.ok .compat-glyph { color: var(--green); }
.compat-row.pending .compat-glyph { color: var(--text-mute); }
.compat-row.pending .compat-detail { color: var(--text-low); }
.compat-row.warn {
  background: rgba(255, 70, 85, 0.08);
  border-left-color: var(--red);
}
.compat-row.warn .compat-glyph,
.compat-row.warn .compat-label,
.compat-row.warn .compat-detail { color: var(--red); }

/* Inline compat summary in the viewer-tabs strip. */
.compat-meta { font-weight: 700; }
.compat-meta.ok { color: var(--green); }
.compat-meta.warn { color: var(--red); }
.compat-meta.pending { color: var(--text-mute); }

.power-bar {
  height: 10px;
  margin-top: 10px;
  background: rgba(10, 18, 32, 0.85);
  border: 1px solid var(--line);
  position: relative;
  overflow: hidden;
}
.power-bar .fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--green), var(--amber));
}
.power-bar-lbl {
  margin-top: 6px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
}

/* ── below the fold: components ── */
.parts-wrap { margin-top: 36px; }
.parts-wrap h2 {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 10px;
  font-weight: 700;
}

.parts-table {
  width: 100%;
  border-collapse: collapse;
  border-top: 1px solid var(--line);
}
.parts-table th,
.parts-table td {
  padding: 12px 10px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}
.parts-table th {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-low);
}
.parts-table .ct {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cyan);
  width: 84px;
}
.parts-table .cn {
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}
.parts-table .cs {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-mute);
  margin-top: 2px;
}
.parts-table .cp {
  font-family: var(--display);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  text-align: right;
  white-space: nowrap;
  width: 120px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.total-row .k {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.total-row .v {
  font-family: var(--display);
  font-size: 28px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.02em;
  line-height: 1;
}

.empty-state.err {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.35);
}

@media (max-width: 1080px) {
  .overview {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }
  .viewer-body { min-height: 460px; }
}
</style>
