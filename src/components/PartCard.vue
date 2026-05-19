<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Part } from '../data/mock'
import { php } from '../data/mock'

// Tile used in the parts catalog grid and the Pinned screen. Clicking
// the body opens the part detail; the pin button is a self-contained
// toggle that doesn't navigate.
defineProps<{
  part: Part
  // When true (Pinned screen) we render a "Pinned X days ago" label
  // instead of the standard Details → button.
  showPinnedMeta?: boolean
  pinnedMeta?: string
}>()

const emit = defineEmits<{ (e: 'toggle-pin', id: string): void }>()
</script>

<template>
  <div class="part-card" :class="{ pinned: part.pinned }">
    <button
      class="pin"
      type="button"
      :title="part.pinned ? 'Unpin' : 'Pin'"
      @click.stop="emit('toggle-pin', part.id)"
    >📌</button>

    <!-- Placeholder image area. The radial gradient gives it a faint
         cyan/purple glow consistent with the design preview. -->
    <RouterLink :to="`/parts/${part.id}`" class="part-img">
      {{ part.icon ?? '🖥' }}
    </RouterLink>

    <span class="h-tag">{{ part.brand }}</span>
    <h4>{{ part.name }}</h4>
    <div class="part-spec">{{ part.spec }}</div>

    <div class="part-foot">
      <span class="price">{{ php(part.price) }}</span>
      <span v-if="showPinnedMeta" class="meta-pinned">{{ pinnedMeta }}</span>
      <RouterLink v-else :to="`/parts/${part.id}`" class="btn-ghost compact">Details →</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.part-card {
  position: relative;
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.part-card:hover {
  border-color: var(--cyan);
  transform: translateY(-2px);
}

/* Pin button — top right. Glows purple when the part is pinned. */
.pin {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  border-radius: 3px;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.part-card.pinned .pin {
  background: rgba(168, 85, 247, 0.15);
  border-color: var(--purple);
  color: var(--purple);
}

.part-img {
  height: 120px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(168, 85, 247, 0.08));
  border: 1px solid var(--line-2);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin-bottom: 14px;
  color: var(--text-mute);
  text-decoration: none;
}

h4 {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin: 8px 0 4px;
}
.part-spec {
  font-size: 12px;
  color: var(--text-mute);
  margin-bottom: 10px;
  line-height: 1.5;
}

.part-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-ghost.compact {
  padding: 6px 12px;
  font-size: 11px;
  text-decoration: none;
}
.meta-pinned {
  font-size: 11px;
  color: var(--text-mute);
}
</style>
