<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import BuildsSubNav from '../../components/BuildsSubNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import type { Build } from '../../data/mock'
import {
  fetchPublicBuilds,
  fetchFavouriteIds,
  toggleFavourite,
  forkBuild,
} from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId } = useSession()
const router = useRouter()

const builds = ref<Build[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')

type SortMode = 'newest' | 'popular' | 'price-asc' | 'price-desc'
const sortMode = ref<SortMode>('newest')
const sortLabels: Record<SortMode, string> = {
  newest:       'Newest',
  popular:      'Popular',
  'price-asc':  'Price ↑',
  'price-desc': 'Price ↓',
}

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
watch(userId, load)

const visibleBuilds = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = builds.value.filter(b => {
    if (!q) return true
    return b.name.toLowerCase().includes(q)
      || b.tags.some(t => t.toLowerCase().includes(q))
  })
  const arr = [...filtered]
  switch (sortMode.value) {
    case 'popular':    return arr.sort((a, b) => b.views - a.views)
    case 'price-asc':  return arr.sort((a, b) => a.totalPrice - b.totalPrice)
    case 'price-desc': return arr.sort((a, b) => b.totalPrice - a.totalPrice)
    default:           return arr // newest = server order (updated_at desc)
  }
})

async function onToggleFav(buildId: string) {
  if (!userId.value) return
  const target = builds.value.find(b => b.id === buildId)
  if (!target) return
  const newState = await toggleFavourite(userId.value, buildId, !!target.favourited)
  target.favourited = newState
}

async function onFork(buildId: string) {
  // BuildCard already gates the action behind the sign-in modal when
  // the user is signed out, so this handler only runs once we have a
  // userId. Bail defensively if that ever changes.
  if (!userId.value) return
  try {
    const newId = await forkBuild(buildId, userId.value)
    router.push(`/builder/manual/${newId}`)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to fork build.'
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <BuildsSubNav />

    <!-- One-line head-bar: title + live count + search + sort. -->
    <div class="head-bar">
      <div class="title">Community Builds</div>
      <span class="count"><b>{{ visibleBuilds.length }}</b> public</span>
      <div class="grow"></div>
      <input v-model="search" class="search" placeholder="Search…" />
      <label class="sort">
        Sort
        <select v-model="sortMode">
          <option v-for="(label, mode) in sortLabels" :key="mode" :value="mode">{{ label }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="empty-state">Loading builds…</div>
    <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>
    <template v-else>
      <div v-if="visibleBuilds.length" class="feed-grid">
        <BuildCard
          v-for="b in visibleBuilds"
          :key="b.id"
          :build="b"
          from="community"
          @toggle-fav="onToggleFav"
          @fork="onFork"
        />
      </div>
      <div v-else class="empty-state">
        <div class="empty-title">No public builds yet</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.head-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.head-bar .title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.015em;
  color: var(--text);
}
.head-bar .count {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
}
.head-bar .count b { color: var(--cyan); font-weight: 500; }
.head-bar .grow { flex: 1; }
.head-bar .search {
  width: 240px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  outline: none;
  border-radius: 0;
}
.head-bar .search:focus { border-color: var(--cyan); }
.head-bar .sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.4);
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.head-bar .sort select {
  background: transparent;
  color: var(--text);
  border: none;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  outline: none;
  cursor: pointer;
}
.head-bar .sort select option { background: var(--bg-2); color: var(--text); }

.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.empty-state .empty-title {
  font-family: var(--display);
  font-size: 16px;
  color: var(--text);
}
.empty-state.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

@media (max-width: 1100px) {
  .feed-grid { grid-template-columns: 1fr 1fr; }
  .head-bar .search { width: auto; flex: 1; min-width: 160px; }
}
@media (max-width: 600px) {
  .feed-grid { grid-template-columns: 1fr; }
}
</style>
