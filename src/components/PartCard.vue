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
    <button
      class="pin"
      type="button"
      :title="part.pinned ? 'Unpin' : 'Pin'"
      @click.stop="emit('toggle-pin', part.id)"
    >📌</button>

    <!-- Grid-paper hero panel. Class label in mono top-left, part icon
         centred — replaces the legacy gradient placeholder. -->
    <RouterLink :to="`/parts/${part.id}`" class="part-img grid-paper">
      <span class="cls">// {{ classTag }}</span>
      {{ part.icon ?? '🖥' }}
    </RouterLink>

    <span class="brand-mono">{{ part.brand }}</span>
    <h4>{{ part.name }}</h4>
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
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: var(--mono);
}
.part-card:hover { border-color: var(--cyan); }

/* Pin button — squared hairline. Glows purple when the part is pinned. */
.pin {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--mono);
  border-radius: 0;
  z-index: 1;
}
.pin:hover { border-color: var(--cyan); color: var(--cyan); }
.part-card.pinned .pin {
  background: rgba(168, 85, 247, 0.15);
  border-color: var(--purple);
  color: var(--purple);
}

.part-img {
  position: relative;
  height: 120px;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin-bottom: 14px;
  color: var(--text-mute);
  text-decoration: none;
}
.part-img .cls {
  position: absolute;
  top: 6px;
  left: 8px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  text-transform: uppercase;
}

.brand-mono {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
  display: inline-block;
  margin-bottom: 6px;
}

h4 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  margin: 4px 0 6px;
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.part-spec {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 12px;
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
  font-size: 16px;
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
