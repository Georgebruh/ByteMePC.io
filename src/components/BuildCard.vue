<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Build } from '../data/mock'
import { php } from '../data/mock'

// Tile used in both the Public Feed and the Favourites screens. Whole
// card links to the build detail. The heart button is self-contained
// and emits an event so the parent can update the favourite store.
defineProps<{ build: Build }>()

const emit = defineEmits<{ (e: 'toggle-fav', id: string): void }>()
</script>

<template>
  <RouterLink :to="`/builds/${build.id}`" class="build-card">
    <!-- Decorative tile background — radial accents like the design preview. -->
    <div class="build-img">{{ build.icon }}</div>

    <div class="build-body">
      <div class="build-meta">
        <span>{{ build.user }}</span>
        <span>{{ build.views.toLocaleString() }} views</span>
      </div>

      <h3>{{ build.name }}</h3>
      <p class="desc">{{ build.desc }}</p>

      <div class="build-tags">
        <span v-for="t in build.tags" :key="t" class="h-tag">{{ t }}</span>
      </div>

      <div class="build-foot">
        <span class="price">{{ php(build.totalPrice) }}</span>
        <button
          class="heart"
          :class="{ fav: build.favourited }"
          type="button"
          :title="build.favourited ? 'Unfavourite' : 'Favourite'"
          @click.prevent="emit('toggle-fav', build.id)"
        >{{ build.favourited ? '♥' : '♡' }}</button>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.build-card {
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: block;
  text-decoration: none;
  color: inherit;
}
.build-card:hover {
  border-color: var(--cyan);
  transform: translateY(-2px);
}

.build-img {
  height: 160px;
  background:
    linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(168, 85, 247, 0.10) 60%, transparent),
    radial-gradient(circle at 70% 40%, rgba(255, 70, 85, 0.2), transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  color: var(--text-mute);
  border-bottom: 1px solid var(--line);
}

.build-body { padding: 18px; }
.build-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-mute);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

h3 {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
  color: #fff;
}
.desc {
  font-size: 13px;
  color: var(--text-mute);
  line-height: 1.5;
  margin-bottom: 12px;
}

.build-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 14px;
}

.build-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--line-2);
}

/* Heart toggle. Outline-only by default, fills red when favourited. */
.heart {
  width: 32px;
  height: 32px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-mute);
  font-family: inherit;
}
.heart.fav {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.4);
  background: rgba(255, 70, 85, 0.06);
}
</style>
