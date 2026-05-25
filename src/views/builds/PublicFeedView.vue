<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppNav from '../../components/AppNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import type { Build } from '../../data/mock'
import {
  fetchPublicBuilds,
  fetchFavouriteIds,
  toggleFavourite,
} from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId } = useSession()

// All public builds loaded from Supabase. Each card's heart state is
// derived from the user's favourite_builds set when they're signed in.
const builds = ref<Build[]>([])
const loading = ref(true)
const errorMsg = ref('')

const chips = ['All', 'Gaming', 'Workstation', 'Budget', 'High-End', 'SFF / ITX']
const activeChip = ref('All')
const search = ref('')

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const favIds = userId.value
      ? await fetchFavouriteIds(userId.value)
      : new Set<string>()
    builds.value = await fetchPublicBuilds(favIds)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load builds.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
// Re-load when the auth session changes so heart states stay accurate.
watch(userId, load)

const visibleBuilds = computed(() => {
  const q = search.value.trim().toLowerCase()
  return builds.value.filter(b => {
    if (!q) return true
    return b.name.toLowerCase().includes(q)
      || b.tags.some(t => t.toLowerCase().includes(q))
  })
})

async function onToggleFav(buildId: string) {
  if (!userId.value) return
  const target = builds.value.find(b => b.id === buildId)
  if (!target) return
  const newState = await toggleFavourite(userId.value, buildId, !!target.favourited)
  target.favourited = newState
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// field notes</span>
        <div class="section-title">Community Builds</div>
        <div class="section-sub">Public builds shared by the community</div>
      </div>
      <button class="t-btn">Sort: Popular</button>
    </div>

    <!-- Filter chips + search live on the same row. -->
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

    <div v-if="loading" class="empty-state">Loading builds…</div>
    <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>
    <template v-else>
      <div v-if="visibleBuilds.length" class="feed-grid">
        <BuildCard
          v-for="b in visibleBuilds"
          :key="b.id"
          :build="b"
          @toggle-fav="onToggleFav"
        />
      </div>
      <div v-else class="empty-state">
        <div class="ic">📡</div>
        <div class="empty-title">No public builds yet</div>
        <div class="empty-sub">Be the first to publish one from the Builder.</div>
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

.feed-controls {
  display: flex;
  gap: 12px;
  margin: 18px 0 22px;
  align-items: center;
  flex-wrap: wrap;
}

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

.empty-state .ic {
  font-size: 40px;
  margin-bottom: 12px;
}
.empty-state .empty-title {
  font-family: var(--display);
  font-size: 18px;
  color: var(--text);
  margin-bottom: 6px;
}
.empty-state .empty-sub {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-low);
}
.empty-state.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

@media (max-width: 1100px) {
  .feed-grid { grid-template-columns: 1fr 1fr; }
  .spacer { display: none; }
  .search { max-width: 100%; flex: 1; }
}
@media (max-width: 600px) {
  .feed-grid { grid-template-columns: 1fr; }
}
</style>
