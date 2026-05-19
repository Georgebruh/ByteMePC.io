<script setup lang="ts">
import { computed, ref } from 'vue'
import AppNav from '../../components/AppNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import { builds } from '../../data/mock'

// Filter chips along the top of the feed. "All" shows everything; the
// rest are placeholder taxonomies until the DB exposes real ones.
const chips = ['All', 'Gaming', 'Workstation', 'Budget', 'High-End', 'SFF / ITX']
const activeChip = ref('All')

// Search filter applies to the build name + tags.
const search = ref('')

const visibleBuilds = computed(() => {
  const q = search.value.trim().toLowerCase()
  return builds.filter(b => {
    if (!q) return true
    return b.name.toLowerCase().includes(q)
      || b.tags.some(t => t.toLowerCase().includes(q))
  })
})
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <div class="section-title">Community Builds</div>
        <div class="section-sub">8,942 public builds shared by the ByteMePC community.</div>
      </div>
      <button class="btn-ghost">⚙ Sort: Most Popular</button>
    </div>

    <!-- Chip row + search box live on the same line. -->
    <div class="feed-controls">
      <button
        v-for="c in chips"
        :key="c"
        class="chip"
        :class="{ active: activeChip === c }"
        @click="activeChip = c"
      >{{ c }}</button>
      <div class="spacer" />
      <input class="input search" v-model="search" placeholder="🔍  Search builds…" />
    </div>

    <!-- The card grid. BuildCard handles its own click + favourite logic. -->
    <div class="feed-grid">
      <BuildCard v-for="b in visibleBuilds" :key="b.id" :build="b" />
    </div>

    <div v-if="!visibleBuilds.length" class="empty-state">
      <div class="ic" style="font-size:40px;margin-bottom:12px">🔍</div>
      No builds match your search.
    </div>
  </div>
</template>

<style scoped>
.feed-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.chip {
  padding: 7px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--line);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-mute);
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
}
.chip:hover { color: #cdd; }
.chip.active {
  background: rgba(0, 212, 255, 0.1);
  border-color: var(--cyan);
  color: var(--cyan);
}

.spacer { flex: 1; }
.search { max-width: 280px; }

.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

@media (max-width: 1100px) {
  .feed-grid { grid-template-columns: 1fr 1fr; }
  .spacer { display: none; }
  .search { max-width: 100%; flex: 1; }
}
@media (max-width: 600px) {
  .feed-grid { grid-template-columns: 1fr; }
}
</style>
