<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import PartCard from '../../components/PartCard.vue'
import { type PartCategory } from '../../data/mock'
import { fetchPinnedParts, unpinPart, type PinnedPart } from '../../data/pins'
import { useSession } from '../../lib/session'

const { isSignedIn, userId } = useSession()
const route = useRoute()

// "All" plus the part categories. The user can filter the pinned grid
// down to a single category.
type Filter = 'all' | PartCategory
const activeFilter = ref<Filter>('all')

// Live pinned parts for the signed-in user, loaded from the eight
// per-category pin tables.
const pinnedParts = ref<PinnedPart[]>([])
const loading = ref(false)
const errorMsg = ref<string | null>(null)

async function loadPins() {
  if (!userId.value) {
    pinnedParts.value = []
    return
  }
  loading.value = true
  errorMsg.value = null
  try {
    pinnedParts.value = await fetchPinnedParts(userId.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to load pinned parts.'
    pinnedParts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadPins)
watch(userId, loadPins)

// Counts per category — shown in the tab labels.
const counts = computed(() => {
  const c: Record<Filter, number> = { all: 0, cpu: 0, motherboard: 0, gpu: 0, ram: 0, storage: 0, psu: 0, case: 0, cooler: 0 }
  for (const p of pinnedParts.value) {
    c.all++
    c[p.category]++
  }
  return c
})

const visibleParts = computed(() =>
  activeFilter.value === 'all'
    ? pinnedParts.value
    : pinnedParts.value.filter(p => p.category === activeFilter.value)
)

// "pinned 3d ago" label derived from each part's pinned_at timestamp.
function pinnedLabel(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'pinned recently'
  const diffSec = Math.max(0, (Date.now() - then) / 1000)
  if (diffSec < 60)       return 'pinned just now'
  if (diffSec < 3600)     return `pinned ${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400)    return `pinned ${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800)   return `pinned ${Math.floor(diffSec / 86400)}d ago`
  if (diffSec < 2592000)  return `pinned ${Math.floor(diffSec / 604800)}w ago`
  if (diffSec < 31536000) return `pinned ${Math.floor(diffSec / 2592000)}mo ago`
  return `pinned ${Math.floor(diffSec / 31536000)}y ago`
}

// Unpin a single part (the card's only pin action here, since everything
// on this screen is already pinned). Optimistically drops it from the grid
// and restores it if the delete fails.
async function onTogglePin(id: string) {
  if (!userId.value) return
  const idx = pinnedParts.value.findIndex(p => p.id === id)
  if (idx === -1) return
  const [removed] = pinnedParts.value.splice(idx, 1)
  try {
    await unpinPart(userId.value, id)
  } catch {
    pinnedParts.value.splice(idx, 0, removed)
  }
}

// Clear every pin across all categories. Fires the deletes in parallel and
// reloads from the DB so the grid reflects whatever actually persisted.
async function clearAllPins() {
  if (!userId.value || !pinnedParts.value.length) return
  const uid = userId.value
  const ids = pinnedParts.value.map(p => p.id)
  pinnedParts.value = []
  try {
    await Promise.all(ids.map(id => unpinPart(uid, id)))
  } finally {
    await loadPins()
  }
}

const tabs: Array<{ key: Filter; label: string }> = [
  { key: 'all',         label: 'All' },
  { key: 'cpu',         label: 'CPU' },
  { key: 'motherboard', label: 'Motherboard' },
  { key: 'gpu',         label: 'GPU' },
  { key: 'ram',         label: 'RAM' },
  { key: 'storage',     label: 'Storage' },
  { key: 'psu',         label: 'PSU' },
  { key: 'case',        label: 'Case' },
  { key: 'cooler',      label: 'Cooler' },
]
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- Pins are per-user, so signed-out viewers get a sign-in CTA
         instead of the hard-coded mock pinned items. -->
    <div v-if="!isSignedIn" class="empty-state auth-gate">
      <div class="empty-title">Sign in to view your pinned parts</div>
      <div class="empty-sub">Pinning saves a part to your watch-list so you can revisit it across sessions.</div>
      <div class="empty-cta">
        <RouterLink
          :to="`/sign-in?redirect=${encodeURIComponent(route.fullPath)}`"
          class="t-btn primary"
        >Sign In</RouterLink>
        <RouterLink
          :to="`/sign-up?redirect=${encodeURIComponent(route.fullPath)}`"
          class="t-btn"
        >Create Account</RouterLink>
      </div>
    </div>

    <template v-else>
    <div class="page-header">
      <div>
        <span class="kicker">// watch-list</span>
        <div class="section-title">Pinned Components</div>
        <div class="section-sub">Parts you're watching across all categories.</div>
      </div>
      <button
        class="t-btn warn"
        :disabled="!pinnedParts.length || loading"
        @click="clearAllPins"
      >Clear All Pins</button>
    </div>

    <!-- Segmented category tabs — matches Browse + AppNav. -->
    <div class="seg-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="seg"
        :class="{ active: activeFilter === t.key }"
        @click="activeFilter = t.key"
      >{{ t.label }} · {{ counts[t.key] }}</button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="ic" style="font-size:40px;margin-bottom:12px">⏳</div>
      Loading pinned parts…
    </div>

    <div v-else-if="errorMsg" class="empty-state error">
      <div class="ic" style="font-size:40px;margin-bottom:12px">⚠</div>
      Couldn't load pinned parts.
      <div class="err-detail">{{ errorMsg }}</div>
    </div>

    <template v-else>
      <div class="parts-grid">
        <PartCard
          v-for="p in visibleParts"
          :key="p.id"
          :part="p"
          show-pinned-meta
          :pinned-meta="pinnedLabel(p.pinnedAt)"
          @toggle-pin="onTogglePin"
        />
      </div>

      <div v-if="!visibleParts.length" class="empty-state">
        <div class="ic" style="font-size:40px;margin-bottom:12px">📌</div>
        Nothing pinned in this category yet.
      </div>
    </template>
    </template>
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

.empty-state.error { color: var(--red); }
.empty-state .err-detail {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.04em;
}

.seg-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  margin-bottom: 22px;
  overflow-x: auto;
  width: fit-content;
}
.seg {
  padding: 8px 16px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}
.seg:hover:not(.active) { color: var(--text); }
.seg.active { background: var(--text); color: var(--bg); }

.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

/* Sign-in prompt that replaces the grid for anonymous viewers. */
.empty-state.auth-gate {
  padding: 64px 24px;
  text-align: center;
}
.empty-state.auth-gate .empty-title {
  font-family: var(--display);
  font-size: 20px;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: -0.015em;
}
.empty-state.auth-gate .empty-sub {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.06em;
  margin-bottom: 22px;
}
.empty-state.auth-gate .empty-cta {
  display: inline-flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
@media (max-width: 1100px) {
  .parts-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
}
</style>
