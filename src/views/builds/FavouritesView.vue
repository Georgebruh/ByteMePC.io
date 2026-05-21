<script setup lang="ts">
import { computed } from 'vue'
import AppNav from '../../components/AppNav.vue'
import BuildCard from '../../components/BuildCard.vue'
import { builds } from '../../data/mock'

// Favourites are just the public builds with the favourited flag set.
// Reuses the same BuildCard from the public feed so layout stays
// consistent.
const favouriteBuilds = computed(() => builds.filter(b => b.favourited))
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// saved · favourites</span>
        <div class="section-title">Favourite Builds</div>
        <div class="section-sub">
          {{ favouriteBuilds.length }} build{{ favouriteBuilds.length === 1 ? '' : 's' }}
          saved from the community
        </div>
      </div>
      <button class="t-btn">Sort: Date Saved</button>
    </div>

    <div v-if="favouriteBuilds.length" class="feed-grid">
      <BuildCard v-for="b in favouriteBuilds" :key="b.id" :build="b" />
    </div>

    <!-- Empty state — shown when the user has unfavourited everything. -->
    <div v-else class="empty-state">
      <div class="ic" style="font-size:40px;margin-bottom:12px">♡</div>
      You haven't favourited any builds yet.
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

.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .feed-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .feed-grid { grid-template-columns: 1fr; }
}
</style>
