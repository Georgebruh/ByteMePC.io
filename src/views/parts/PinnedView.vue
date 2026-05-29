<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import PartCard from '../../components/PartCard.vue'
import { parts, type PartCategory } from '../../data/mock'
import { useSession } from '../../lib/session'

const { isSignedIn } = useSession()
const route = useRoute()

// "All" plus the five part categories. The user can filter the pinned
// grid down to a single category.
type Filter = 'all' | PartCategory
const activeFilter = ref<Filter>('all')

const pinnedParts = computed(() => parts.filter(p => p.pinned))

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

// Faked pin-timestamps. Maps part id → friendly relative label.
const pinnedAgo: Record<string, string> = {
  'cpu-13900k':     'pinned 4 days ago',
  'gpu-4090':       'pinned 1 week ago',
  'mb-z790-hero':   'pinned 2 weeks ago',
  'ram-corsair-32': 'pinned 3 weeks ago',
  'psu-hx1000i':    'pinned 1 month ago',
  'cpu-7800x3d':    'pinned 1 month ago',
}

const tabs: Array<{ key: Filter; label: string }> = [
  { key: 'all',         label: 'All' },
  { key: 'cpu',         label: 'CPU' },
  { key: 'motherboard', label: 'Motherboard' },
  { key: 'gpu',         label: 'GPU' },
  { key: 'ram',         label: 'RAM' },
  { key: 'psu',         label: 'PSU' },
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
      <button class="t-btn warn">Clear All Pins</button>
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

    <div class="parts-grid">
      <PartCard
        v-for="p in visibleParts"
        :key="p.id"
        :part="p"
        show-pinned-meta
        :pinned-meta="pinnedAgo[p.id] ?? 'pinned recently'"
      />
    </div>

    <div v-if="!visibleParts.length" class="empty-state">
      <div class="ic" style="font-size:40px;margin-bottom:12px">📌</div>
      Nothing pinned in this category yet.
    </div>
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
