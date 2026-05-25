<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import BuildsSubNav from '../../components/BuildsSubNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import type { Build } from '../../data/mock'
import { fetchFavouriteBuilds, toggleFavourite } from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId, isSignedIn } = useSession()

const favouriteBuilds = ref<Build[]>([])
const loading = ref(true)
const errorMsg = ref('')

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

async function onToggleFav(buildId: string) {
  if (!userId.value) return
  await toggleFavourite(userId.value, buildId, true)
  // Removing a favourite drops it from this list immediately.
  favouriteBuilds.value = favouriteBuilds.value.filter(b => b.id !== buildId)
}
</script>

<template>
  <AppNav />

  <div class="page">
    <BuildsSubNav />

    <div class="page-header">
      <div>
        <span class="kicker">// saved · favourites</span>
        <div class="section-title">Favourite Builds</div>
        <div class="section-sub">
          {{ favouriteBuilds.length }}
          build{{ favouriteBuilds.length === 1 ? '' : 's' }} saved
        </div>
      </div>
    </div>

    <div v-if="!isSignedIn && !loading" class="empty-state">
      <div class="ic">🔒</div>
      <div class="empty-title">Sign in to view favourites</div>
      <div class="empty-sub">Favourites you save from Field Notes show up here.</div>
      <div class="empty-cta">
        <RouterLink to="/sign-in" class="t-btn primary">Sign In</RouterLink>
      </div>
    </div>

    <template v-else>
      <div v-if="loading" class="empty-state">Loading favourites…</div>
      <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

      <template v-else>
        <div v-if="favouriteBuilds.length" class="feed-grid">
          <BuildCard
            v-for="b in favouriteBuilds"
            :key="b.id"
            :build="b"
            @toggle-fav="onToggleFav"
          />
        </div>
        <div v-else class="empty-state">
          <div class="ic">♡</div>
          <div class="empty-title">No favourites yet</div>
          <div class="empty-sub">Heart any public build to save it here.</div>
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

.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.empty-state .ic { font-size: 40px; margin-bottom: 12px; }
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
.empty-state .empty-cta {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 18px;
}
.empty-state.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

@media (max-width: 1100px) {
  .feed-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .feed-grid { grid-template-columns: 1fr; }
}
</style>
