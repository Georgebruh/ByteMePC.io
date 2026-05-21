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

// Trending ticker — frozen mock data, parallel to the landing's.
type Trend = { name: string; pins: string; dir: 'up' | 'dn' | 'hot' }
const trending: Trend[] = [
  { name: 'MIDNIGHT FOUNDRY', pins: '412 PINS', dir: 'hot' },
  { name: 'SILENT STORM',     pins: '287 PINS', dir: 'up'  },
  { name: 'APEX PREDATOR V2', pins: '231 PINS', dir: 'up'  },
  { name: 'BUDGET BEAST MK1', pins: '174 PINS', dir: 'dn'  },
  { name: 'WORKSTATION 2026', pins: '142 PINS', dir: 'up'  },
  { name: 'NORTH STAR ITX',   pins: '118 PINS', dir: 'hot' },
]
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// field notes</span>
        <div class="section-title">Community Builds</div>
        <div class="section-sub">8,942 public builds · live trending index</div>
      </div>
      <button class="t-btn">Sort: Popular</button>
    </div>

    <!-- Trending builds ticker. -->
    <div class="ticker" aria-hidden="true">
      <div class="scroll">
        <template v-for="pass in 2" :key="pass">
          <span v-for="t in trending" :key="`${pass}-${t.name}`" class="tick">
            <b>{{ t.name }}</b>
            {{ t.pins }}
            <em :class="`d-${t.dir}`">
              {{ t.dir === 'hot' ? '↑ HOT' : t.dir === 'up' ? '↑' : '↓' }}
            </em>
          </span>
        </template>
      </div>
    </div>

    <!-- Chip row + search box live on the same line. -->
    <div class="feed-controls">
      <div class="seg-tabs">
        <button
          v-for="c in chips"
          :key="c"
          class="seg"
          :class="{ active: activeChip === c }"
          @click="activeChip = c"
        >{{ c }}</button>
      </div>
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

/* Trending ticker — same vocab as Browse / landing. */
.ticker {
  padding: 8px 16px;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin: 18px 0 22px;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
}
.ticker .scroll {
  display: inline-flex;
  gap: 40px;
  white-space: nowrap;
  animation: feed-scroll 50s linear infinite;
}
.ticker .tick { display: inline-flex; align-items: baseline; gap: 8px; }
.ticker b      { color: var(--cyan); font-weight: 500; }
.ticker .d-up  { color: var(--green); font-style: normal; }
.ticker .d-dn  { color: var(--red);   font-style: normal; }
.ticker .d-hot { color: var(--amber); font-style: normal; }
@keyframes feed-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker .scroll { animation: none !important; }
}

.feed-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  align-items: center;
  flex-wrap: wrap;
}

/* Hairline segmented chips — same pattern as Browse + AppNav. */
.seg-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  overflow-x: auto;
}
.seg {
  padding: 7px 14px;
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}
.seg:hover:not(.active) { color: var(--text); }
.seg.active { background: var(--text); color: var(--bg); }

.spacer { flex: 1; }
.search { max-width: 280px; }

.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
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
