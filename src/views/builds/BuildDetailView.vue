<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import type { Build, BuildPartRef } from '../../data/mock'
import { php } from '../../data/mock'
import { fetchBuildById, toggleFavourite } from '../../data/builds'
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
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink to="/community">Builds</RouterLink>
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
            <span class="meta">{{ filledCount }} / {{ UML_SLOTS.length }} slots · compat ✓</span>
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
              <span class="pill" :class="{ private: !build.isPublic }">
                {{ build.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            <div class="author"><b>{{ build.user }}</b></div>
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
            <div class="compat">
              <div class="row">
                <span class="k">Slots filled</span>
                <span class="v">{{ filledCount }} / {{ UML_SLOTS.length }}</span>
              </div>
              <div class="row">
                <span class="k">Parts</span>
                <span class="v">{{ build.parts.length }}</span>
              </div>
              <div class="row">
                <span class="k">Schema</span>
                <span class="v">✓ Valid</span>
              </div>
            </div>
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
.compat {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-family: var(--mono);
  font-size: 10.5px;
}
.compat .row { display: flex; justify-content: space-between; gap: 14px; }
.compat .row .k { color: var(--text-mute); }
.compat .row .v { color: var(--green); }

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
