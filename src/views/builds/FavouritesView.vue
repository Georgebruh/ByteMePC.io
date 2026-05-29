<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import BuildsSubNav from '../../components/BuildsSubNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import type { Build } from '../../data/mock'
import { fetchFavouriteBuilds, toggleFavourite, forkBuild } from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId, isSignedIn } = useSession()
const router = useRouter()

const favouriteBuilds = ref<Build[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')

type SortMode = 'recent' | 'price-asc' | 'price-desc'
const sortMode = ref<SortMode>('recent')
const sortLabels: Record<SortMode, string> = {
  recent:       'Recently Saved',
  'price-asc':  'Price ↑',
  'price-desc': 'Price ↓',
}

async function load() {
  if (!userId.value) {
    favouriteBuilds.value = []
    loading.value = false
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    favouriteBuilds.value = await fetchFavouriteBuilds(userId.value)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load favourites.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(userId, load)

const visibleBuilds = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = favouriteBuilds.value.filter(b => {
    if (!q) return true
    return b.name.toLowerCase().includes(q)
      || b.tags.some(t => t.toLowerCase().includes(q))
  })
  const arr = [...filtered]
  switch (sortMode.value) {
    case 'price-asc':  return arr.sort((a, b) => a.totalPrice - b.totalPrice)
    case 'price-desc': return arr.sort((a, b) => b.totalPrice - a.totalPrice)
    default:           return arr // recent = server order
  }
})

async function onToggleFav(buildId: string) {
  if (!userId.value) return
  await toggleFavourite(userId.value, buildId, true)
  favouriteBuilds.value = favouriteBuilds.value.filter(b => b.id !== buildId)
}

async function onFork(buildId: string) {
  // BuildCard already gates this behind the sign-in modal when the
  // user is signed out. Bail defensively if that ever changes.
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

    <div v-if="!isSignedIn && !loading" class="empty-state">
      <div class="empty-title">Sign in to view favourites</div>
      <div class="empty-cta">
        <RouterLink to="/sign-in" class="t-btn primary">Sign In</RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- Same shape as the community head-bar — red accent on the
           count so it reads as a saved/heart context. -->
      <div class="head-bar">
        <div class="title">Favourites</div>
        <span class="count"><b>♥ {{ visibleBuilds.length }}</b> saved</span>
        <div class="grow"></div>
        <input v-model="search" class="search" placeholder="Search saved…" />
        <label class="sort">
          Sort
          <select v-model="sortMode">
            <option v-for="(label, mode) in sortLabels" :key="mode" :value="mode">{{ label }}</option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="empty-state">Loading favourites…</div>
      <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

      <template v-else>
        <div v-if="visibleBuilds.length" class="feed-grid">
          <BuildCard
            v-for="b in visibleBuilds"
            :key="b.id"
            :build="b"
            from="favourites"
            @toggle-fav="onToggleFav"
            @fork="onFork"
          />
        </div>
        <div v-else class="empty-state">
          <div class="empty-title">No favourites yet</div>
        </div>
      </template>
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
.head-bar .count b { color: var(--red); font-weight: 500; }
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
  margin-bottom: 12px;
}
.empty-state .empty-cta {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
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
