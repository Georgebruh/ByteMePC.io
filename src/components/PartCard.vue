<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Part } from '../data/mock'
import { php } from '../data/mock'

// Tile used in the parts catalog grid and the Pinned screen. Clicking
// the body opens the part detail; the pin button is a self-contained
// toggle that doesn't navigate.
const props = defineProps<{
  part: Part
  // When true (Pinned screen) we render a "Pinned X days ago" label
  // instead of the standard Details → button.
  showPinnedMeta?: boolean
  pinnedMeta?: string
}>()

const emit = defineEmits<{ (e: 'toggle-pin', id: string): void }>()

// Mono part-class label used in the top-left of the hero panel.
const classTag = computed(() => {
  switch (props.part.category) {
    case 'cpu':         return 'CPU'
    case 'motherboard': return 'MB'
    case 'gpu':         return 'GPU'
    case 'ram':         return 'RAM'
    case 'psu':         return 'PSU'
  }
})
</script>

<template>
  <div class="part-card" :class="{ pinned: part.pinned }">
    <!-- Grid-paper hero panel. Class label top-left; pin button now lives
         INSIDE this panel (top-right) instead of floating over the text. -->
    <RouterLink :to="`/parts/${part.id}`" class="part-img grid-paper">
      <span class="cls">// {{ classTag }}</span>

      <button
        class="pin"
        :class="{ 'is-pinned': part.pinned }"
        type="button"
        :title="part.pinned ? 'Unpin' : 'Pin'"
        :aria-pressed="!!part.pinned"
        @click.stop.prevent="emit('toggle-pin', part.id)"
      >
        <!-- Filled pushpin when pinned; outline pushpin when not.
             Two distinct SVGs so the silhouettes read clearly at 16px. -->
        <svg
          v-if="part.pinned"
          class="pin-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3 H15 L14 9 L17.5 12 H6.5 L10 9 Z" />
          <line x1="12" y1="12" x2="12" y2="21" stroke-width="1.6" />
        </svg>
        <svg
          v-else
          class="pin-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3 H15 L14 9 L17.5 12 H6.5 L10 9 Z" />
          <line x1="12" y1="12" x2="12" y2="21" />
        </svg>
      </button>

      <span class="hero-icon">{{ part.icon ?? '🖥' }}</span>
    </RouterLink>

    <!-- Brand small + name big — clean hierarchy under the hero. -->
    <div class="card-head">
      <span class="brand-mono">{{ part.brand }}</span>
    </div>
    <RouterLink :to="`/parts/${part.id}`" class="title-link">
      <h4>{{ part.name }}</h4>
    </RouterLink>
    <div class="part-spec">{{ part.spec }}</div>

    <div class="part-foot">
      <span class="price-amber">{{ php(part.price) }}</span>
      <span v-if="showPinnedMeta" class="meta-pinned">// {{ pinnedMeta }}</span>
      <RouterLink v-else :to="`/parts/${part.id}`" class="t-btn small">Details →</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.part-card {
  position: relative;
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  padding: 16px;
  transition: border-color 0.2s;
  font-family: var(--mono);
}
.part-card:hover { border-color: var(--cyan); }

/* ─── Hero panel ─── */
.part-img {
  position: relative;
  height: 140px;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  color: var(--text-mute);
  text-decoration: none;
}
.part-img .cls {
  position: absolute;
  top: 8px;
  left: 10px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  text-transform: uppercase;
}
.hero-icon { font-size: 40px; line-height: 1; }

/* ─── Pin button (custom SVG, two states) ───
   Lives inside the hero panel, top-right. Outlined / muted when not
   pinned; filled / purple / slightly rotated when pinned (so the
   silhouette reads "stuck in" at a glance). */
.pin {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(5, 8, 16, 0.85);
  border: 1px solid var(--line);
  color: var(--text-mute);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  border-radius: 0;
  z-index: 2;
}
.pin:hover { border-color: var(--cyan); color: var(--cyan); }
.pin .pin-icon {
  width: 16px;
  height: 16px;
  display: block;
  transition: transform 0.2s ease;
}
.pin.is-pinned {
  background: rgba(168, 85, 247, 0.18);
  border-color: var(--purple);
  color: var(--purple);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
}
.pin.is-pinned .pin-icon { transform: rotate(-12deg); }
.pin:focus-visible { outline: 2px solid var(--cyan); outline-offset: 1px; }

/* ─── Text hierarchy ─── */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.brand-mono {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
}
.title-link { text-decoration: none; color: inherit; }
h4 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 16px;
  color: var(--text);
  margin: 2px 0 8px;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.part-spec {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 14px;
  line-height: 1.5;
}

.part-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.price-amber {
  font-family: var(--display);
  font-weight: 700;
  font-size: 18px;
  color: var(--amber);
  letter-spacing: -0.02em;
}

.t-btn.small {
  padding: 6px 12px;
  font-size: 10px;
}

.meta-pinned {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.06em;
}
</style>
