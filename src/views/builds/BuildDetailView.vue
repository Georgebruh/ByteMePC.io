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

// Toggle between the schematic diagram and the 3D viewer placeholder.
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

// Two-letter mono initials for the author hex-tile.
const authorInitials = computed(() => {
  const u = build.value?.user.replace(/^@/, '') ?? '?'
  return u.slice(0, 2).toUpperCase()
})

// The 8 fixed slot positions in the schematic — every build occupies the
// same grid so empty slots read as "available" rather than "missing".
const SLOT_ORDER: Array<{ tag: string; label: string }> = [
  { tag: 'MOBO',    label: 'Motherboard' },
  { tag: 'CPU',     label: 'CPU' },
  { tag: 'RAM',     label: 'Memory' },
  { tag: 'GPU',     label: 'Graphics' },
  { tag: 'PSU',     label: 'Power' },
  { tag: 'STORAGE', label: 'Storage' },
  { tag: 'CASE',    label: 'Case' },
  { tag: 'COOLER',  label: 'Cooler' },
]

interface Slot {
  tag: string
  label: string
  part?: BuildPartRef
}

// Fold the build's parts list into the fixed slot grid. Multiple RAM
// or storage rows collapse onto their tag's slot (we just show the first
// one — quantity is already baked into the part name).
const slots = computed<Slot[]>(() => {
  const parts = build.value?.parts ?? []
  return SLOT_ORDER.map(s => ({
    tag: s.tag,
    label: s.label,
    part: parts.find(p => p.tag === s.tag),
  }))
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
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink to="/community">Field Notes</RouterLink>
      <span>/</span>
      {{ build?.name ?? '…' }}
    </div>

    <div v-if="loading" class="empty-state">Loading build…</div>
    <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

    <template v-else-if="build">
      <!-- Hero: title + author + total. No tags, no description, no view counts. -->
      <div class="detail-hero spec-frame grid-paper">
        <span class="corner"></span>
        <div class="hero-left">
          <span class="kicker">// build · {{ build.id.slice(0, 8) }}</span>
          <h1>{{ build.name }}</h1>
          <div class="author-row">
            <span class="hex-tile ini">{{ authorInitials }}</span>
            <span class="uname">{{ build.user }}</span>
          </div>
        </div>
        <div class="hero-right">
          <div class="price-lbl">Total · PHP</div>
          <div class="price-val">{{ php(build.totalPrice) }}</div>
        </div>
      </div>

      <!-- Viewer toggle: Schematic ↔ 3D. -->
      <div class="view-bar">
        <span class="kicker mute">// viewer</span>
        <button
          class="t-btn tog"
          :class="{ active: mode === 'schematic' }"
          @click="mode = 'schematic'"
        >Schematic</button>
        <button
          class="t-btn tog"
          :class="{ active: mode === '3d' }"
          @click="mode = '3d'"
        >3D</button>
        <span class="grow" />
        <button
          v-if="userId"
          class="t-btn"
          @click="onToggleFav"
        >{{ build.favourited ? '♥ Favourited' : '♡ Favourite' }}</button>
      </div>

      <!-- Schematic view — every build renders the same 8-slot grid. -->
      <div v-if="mode === 'schematic'" class="schematic">
        <div class="schematic-head">
          <span>SCH-{{ build.id.slice(0, 6).toUpperCase() }}</span>
          <span class="right">{{ build.parts.length }} PARTS · COMPAT ✓</span>
        </div>

        <div class="sch-grid">
          <div
            v-for="s in slots"
            :key="s.tag"
            class="slot"
            :class="{ empty: !s.part, cpu: s.tag === 'CPU' }"
          >
            <div class="tag"><span class="pin" />{{ s.tag }}</div>
            <template v-if="s.part">
              <div>
                <div class="name">{{ s.part.name }}</div>
                <div class="spec">{{ s.part.sub }}</div>
              </div>
              <div class="pr">{{ php(s.part.price) }}</div>
            </template>
            <template v-else>
              <div><div class="name empty-name">— {{ s.label }} —</div></div>
            </template>
          </div>
        </div>
      </div>

      <!-- 3D view — placeholder only. -->
      <div v-else class="viewer-3d">
        <div class="corners-tl" />
        <div class="corners-br" />
        <div class="cube" />
        <div class="label">
          <div class="big">Coming Soon</div>
          <div class="sub">Interactive 3D Build Viewer</div>
        </div>
      </div>

      <!-- Compact total strip. -->
      <div class="total-strip">
        <span>{{ build.parts.length }} PARTS · COMPAT ✓</span>
        <span class="grow" />
        <span>TOTAL</span>
        <span class="total">{{ php(build.totalPrice) }}</span>
      </div>
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

/* ─── Hero strip ─── */
.detail-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: flex-end;
  padding: 24px 28px;
  margin-bottom: 18px;
}
.hero-left .kicker { display: block; margin-bottom: 8px; }
.hero-left h1 {
  font-family: var(--display);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 12px;
  color: var(--text);
}
.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.author-row .ini {
  width: 26px;
  height: 26px;
  font-size: 10px;
}
.author-row .uname {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--cyan);
  font-weight: 500;
  letter-spacing: 0.06em;
}
.hero-right {
  text-align: right;
  border-left: 1px dashed var(--line);
  padding-left: 24px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hero-right .price-lbl {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-low);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.hero-right .price-val {
  font-family: var(--display);
  font-size: 32px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.025em;
  line-height: 1;
}

/* ─── Viewer toggle ─── */
.view-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.view-bar .grow { flex: 1; }
.t-btn.tog {
  padding: 8px 14px;
  font-size: 11px;
}
.t-btn.tog.active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}

/* ─── Schematic ─── */
.schematic {
  position: relative;
  padding: 28px;
  background: rgba(5, 8, 16, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
}
.schematic::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(0deg,  transparent 0 22px, rgba(0, 212, 255, 0.06) 22px 23px),
    repeating-linear-gradient(90deg, transparent 0 22px, rgba(0, 212, 255, 0.06) 22px 23px);
}
.schematic-head {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}
.schematic-head .right { color: var(--text-low); }

.sch-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  position: relative;
  z-index: 1;
}
.slot {
  background: rgba(10, 18, 32, 0.85);
  border: 1px solid var(--line);
  padding: 14px 16px;
  min-height: 102px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.slot.empty {
  background: rgba(10, 18, 32, 0.4);
  border-style: dashed;
}
.slot .tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
  font-weight: 700;
}
.slot .tag .pin {
  width: 8px;
  height: 8px;
  background: var(--cyan);
  box-shadow: 0 0 6px var(--cyan);
}
.slot .name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
  line-height: 1.25;
  margin-top: 6px;
}
.slot .spec {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 3px;
  letter-spacing: 0.04em;
}
.slot .pr {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 13px;
  letter-spacing: -0.015em;
  margin-top: 8px;
}
.slot .empty-name {
  color: var(--text-low);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.slot.empty .tag { color: var(--text-low); }
.slot.empty .tag .pin { background: var(--text-low); box-shadow: none; }

/* CPU slot is the focal node — amber accent so the eye finds it. */
.slot.cpu { border-color: rgba(255, 181, 71, 0.35); }
.slot.cpu .tag { color: var(--amber); }
.slot.cpu .tag .pin { background: var(--amber); box-shadow: 0 0 6px var(--amber); }

/* ─── 3D placeholder ─── */
.viewer-3d {
  position: relative;
  height: 520px;
  background: rgba(5, 8, 16, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-3d::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 50% 60%, rgba(0, 212, 255, 0.10) 0%, transparent 60%),
    repeating-linear-gradient(0deg,  transparent 0 22px, rgba(0, 212, 255, 0.06) 22px 23px),
    repeating-linear-gradient(90deg, transparent 0 22px, rgba(0, 212, 255, 0.06) 22px 23px);
}
.viewer-3d .cube {
  position: relative;
  width: 170px;
  height: 170px;
  border: 1px solid rgba(0, 212, 255, 0.4);
  background: rgba(0, 212, 255, 0.04);
  transform: rotate(45deg) skew(15deg, 15deg);
  box-shadow: 0 0 60px rgba(0, 212, 255, 0.15) inset, 0 0 80px rgba(0, 212, 255, 0.10);
}
.viewer-3d .cube::before,
.viewer-3d .cube::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(0, 212, 255, 0.3);
}
.viewer-3d .cube::before { inset: 18px; }
.viewer-3d .cube::after  { inset: 36px; border-color: rgba(0, 212, 255, 0.18); }

.viewer-3d .label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-family: var(--mono);
}
.viewer-3d .label .big {
  font-family: var(--display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--cyan);
  text-transform: uppercase;
  text-shadow: 0 0 24px rgba(0, 212, 255, 0.5);
}
.viewer-3d .label .sub {
  margin-top: 8px;
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: var(--text-mute);
  text-transform: uppercase;
}
/* Four corner brackets on the viewer frame. */
.viewer-3d .corners-tl,
.viewer-3d .corners-br {
  position: absolute;
  inset: 14px;
  pointer-events: none;
}
.viewer-3d .corners-tl::before,
.viewer-3d .corners-tl::after,
.viewer-3d .corners-br::before,
.viewer-3d .corners-br::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 1px solid var(--cyan);
}
.viewer-3d .corners-tl::before { top: 0; left: 0;  border-right: none; border-bottom: none; }
.viewer-3d .corners-tl::after  { top: 0; right: 0; border-left: none;  border-bottom: none; }
.viewer-3d .corners-br::before { bottom: 0; left: 0;  border-right: none; border-top: none; }
.viewer-3d .corners-br::after  { bottom: 0; right: 0; border-left: none;  border-top: none; }

/* ─── Total strip under the viewer ─── */
.total-strip {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  background: rgba(0, 212, 255, 0.04);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
}
.total-strip .grow { flex: 1; }
.total-strip .total {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 20px;
  letter-spacing: -0.02em;
  text-transform: none;
}

.empty-state.err {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.35);
}

@media (max-width: 1100px) {
  .detail-hero { grid-template-columns: 1fr; gap: 18px; align-items: flex-start; }
  .hero-right {
    border-left: none;
    border-top: 1px dashed var(--line);
    padding-left: 0;
    padding-top: 14px;
    text-align: left;
  }
  .hero-left h1 { font-size: 28px; }
  .sch-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .sch-grid { grid-template-columns: 1fr; }
}
</style>
