<script setup lang="ts">
import { computed, ref } from 'vue'
import AppNav from '../../components/AppNav.vue'
import PartCard from '../../components/PartCard.vue'
import { parts, type PartCategory } from '../../data/mock'

// "All" plus the five part categories. The user can filter the pinned
// grid down to a single category.
type Filter = 'all' | PartCategory
const activeFilter = ref<Filter>('all')

const pinnedParts = computed(() => parts.filter(p => p.pinned))

// Counts per category — shown in the tab labels.
const counts = computed(() => {
  const c: Record<Filter, number> = { all: 0, cpu: 0, motherboard: 0, gpu: 0, ram: 0, psu: 0 }
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
  'cpu-13900k':     'Pinned 4 days ago',
  'gpu-4090':       'Pinned 1 week ago',
  'mb-z790-hero':   'Pinned 2 weeks ago',
  'ram-corsair-32': 'Pinned 3 weeks ago',
  'psu-hx1000i':    'Pinned 1 month ago',
  'cpu-7800x3d':    'Pinned 1 month ago',
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
    <div class="page-header">
      <div>
        <div class="section-title">Pinned Components</div>
        <div class="section-sub">Parts you're watching across all categories.</div>
      </div>
      <button class="btn-ghost">Clear All Pins</button>
    </div>

    <!-- Category tabs. Counts come from the live pinned set so they
         update as soon as the user unpins something. -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
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
        :pinned-meta="pinnedAgo[p.id] ?? 'Pinned recently'"
      />
    </div>

    <div v-if="!visibleParts.length" class="empty-state">
      <div class="ic" style="font-size:40px;margin-bottom:12px">📌</div>
      Nothing pinned in this category yet.
    </div>
  </div>
</template>

<style scoped>
.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 1100px) {
  .parts-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
}
</style>
