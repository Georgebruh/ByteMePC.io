<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Build } from '../data/mock'
import { php } from '../data/mock'

// Tile used in both the Public Feed and the Favourites screens. Whole
// card links to the build detail. The heart button is self-contained
// and emits an event so the parent can update the favourite store.
const props = defineProps<{ build: Build }>()

const emit = defineEmits<{ (e: 'toggle-fav', id: string): void }>()

// Short slug used as the mono tag in the corner of the hero panel —
// gives every card a "blueprint excerpt" identifier.
const slug = computed(() => `RIG-${props.build.id.slice(0, 6).toUpperCase()}`)

// Two-letter mono initials for the author hex-tile.
const authorInitials = computed(() =>
  props.build.user.replace(/^@/, '').slice(0, 2).toUpperCase()
)
</script>

<template>
  <RouterLink :to="`/builds/${build.id}`" class="build-card">
    <!-- Grid-paper hero panel with corner brackets — replaces the
         legacy radial-glow tile. -->
    <div class="build-img spec-frame grid-paper">
      <span class="corner"></span>
      <span class="slug">// {{ slug }}</span>
      <span class="ic">{{ build.icon }}</span>
    </div>

    <div class="build-body">
      <div class="meta-row">
        <span class="hex-tile ini">{{ authorInitials }}</span>
        <span class="handle">{{ build.user }}</span>
        <span class="views">· {{ build.views.toLocaleString() }} VIEWS</span>
      </div>

      <h3>{{ build.name }}</h3>
      <p class="desc">{{ build.desc }}</p>

      <div class="build-tags">
        <span v-for="t in build.tags" :key="t" class="h-tag">{{ t }}</span>
      </div>

      <div class="build-foot">
        <span class="price-amber">{{ php(build.totalPrice) }}</span>
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
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
  display: block;
  text-decoration: none;
  color: inherit;
  font-family: var(--mono);
}
.build-card:hover { border-color: var(--cyan); }

/* Hero panel — grid-paper background, corner brackets, mono slug top
   left, build icon centred. The corner brackets are provided by the
   shared .spec-frame utility. */
.build-img {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  color: var(--text-mute);
  border: none;
  border-bottom: 1px solid var(--line);
  position: relative;
}
.build-img .slug {
  position: absolute;
  top: 8px;
  left: 10px;
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  text-transform: uppercase;
}
.build-img .ic {
  display: inline-block;
  line-height: 1;
}
/* .spec-frame's corner brackets are absolutely positioned on the
   element itself, so we need to give it position context. The .build-img
   already has position: relative for the slug above. */

.build-body { padding: 18px; }

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.meta-row .ini {
  width: 22px;
  height: 22px;
  font-size: 9px;
}
.meta-row .handle { color: var(--cyan); font-weight: 500; }
.meta-row .views  { color: var(--text-low); }

h3 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.015em;
  color: var(--text);
  margin-bottom: 6px;
  line-height: 1.15;
}
.desc {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--text-dim);
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
  border-top: 1px dashed var(--line);
}

/* Amber price — matches the landing spec-sheet rhythm. */
.price-amber {
  font-family: var(--display);
  font-weight: 700;
  font-size: 18px;
  color: var(--amber);
  letter-spacing: -0.02em;
}

/* Squared hairline heart. Outline-only by default, fills red on fav. */
.heart {
  width: 30px;
  height: 30px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-mute);
  font-family: var(--mono);
  border-radius: 0;
}
.heart:hover { border-color: var(--cyan); color: var(--cyan); }
.heart.fav {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.4);
  background: rgba(255, 70, 85, 0.06);
}
</style>
