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
    <!-- Animated motherboard silhouette — the build's fallback image
         while there's no per-build render. Replaces the emoji tile. -->
    <div class="build-img spec-frame grid-paper">
      <span class="corner"></span>
      <span class="slug">// {{ slug }}</span>
      <svg class="mb" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect class="pad-soft" x="14" y="14" width="332" height="152" rx="2"/>
        <!-- 24-pin power -->
        <rect class="pad-soft" x="30" y="30" width="74" height="34"/>
        <text class="lbl" x="67" y="51" text-anchor="middle">24-PIN</text>
        <circle class="led l3" cx="34" cy="34" r="2"/>
        <!-- CPU socket -->
        <rect class="pad" x="120" y="30" width="60" height="56"/>
        <text class="lbl" x="150" y="62" text-anchor="middle">CPU</text>
        <circle class="led" cx="124" cy="34" r="2"/>
        <!-- DDR slots -->
        <rect class="pad" x="200" y="26" width="10" height="70"/>
        <rect class="pad" x="216" y="26" width="10" height="70"/>
        <rect class="pad" x="232" y="26" width="10" height="70"/>
        <rect class="pad" x="248" y="26" width="10" height="70"/>
        <text class="lbl" x="229" y="108" text-anchor="middle">DDR5</text>
        <!-- chipset -->
        <rect class="pad" x="135" y="104" width="30" height="30"/>
        <text class="lbl" x="150" y="122" text-anchor="middle">Z790</text>
        <circle class="led l2" cx="139" cy="108" r="2"/>
        <!-- M.2 -->
        <rect class="pad-soft" x="40" y="100" width="56" height="10"/>
        <text class="lbl" x="68" y="108" text-anchor="middle">M.2</text>
        <circle class="led l4" cx="44" cy="105" r="1.6"/>
        <!-- PCIe x16 -->
        <rect class="pad" x="40" y="130" width="260" height="10"/>
        <text class="lbl" x="170" y="138" text-anchor="middle">PCIe x16</text>
        <!-- traces -->
        <path class="ln" d="M 67 64 L 67 90 L 120 90"/>
        <path class="ln" d="M 180 60 L 198 60"/>
        <path class="ln" d="M 150 86 L 150 104"/>
        <path class="ln" d="M 96 105 L 135 105"/>
        <path class="ln" d="M 165 135 L 165 134"/>
        <path class="ln" d="M 67 64 L 67 130 L 40 130"/>
      </svg>
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
/* Animated motherboard fallback artwork. Sized to fit the 150px
   hero with breathing room on either side via preserveAspectRatio. */
.build-img .mb {
  width: 100%;
  height: 100%;
  padding: 14px 14px 8px;
}
.build-img .mb .pad {
  fill: rgba(10, 18, 32, 0.85);
  stroke: rgba(0, 212, 255, 0.45);
  stroke-width: 1.5;
}
.build-img .mb .pad-soft {
  fill: rgba(10, 18, 32, 0.6);
  stroke: rgba(0, 212, 255, 0.18);
  stroke-width: 1;
}
.build-img .mb .lbl {
  font-family: var(--mono);
  font-size: 7px;
  fill: rgba(0, 212, 255, 0.7);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.build-img .mb .ln {
  fill: none;
  stroke: rgba(0, 212, 255, 0.35);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  animation: mb-flow 2.4s linear infinite;
}
.build-img .mb .led {
  fill: var(--cyan);
  filter: drop-shadow(0 0 6px var(--cyan));
  animation: mb-blink 2.2s ease-in-out infinite;
}
.build-img .mb .led.l2 {
  animation-delay: 0.6s;
  fill: var(--amber);
  filter: drop-shadow(0 0 6px var(--amber));
}
.build-img .mb .led.l3 {
  animation-delay: 1.1s;
  fill: var(--purple);
  filter: drop-shadow(0 0 6px var(--purple));
}
.build-img .mb .led.l4 {
  animation-delay: 1.5s;
  fill: var(--green);
  filter: drop-shadow(0 0 6px var(--green));
}
@keyframes mb-flow { to { stroke-dashoffset: -21; } }
@keyframes mb-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
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
