<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

// Sub-navigation rendered at the top of every "Builds" page (Community
// feed, My Builds, Favourites). Keeping the three tabs in one component
// means they stay in lock-step across screens and you can switch views
// without bouncing through the main nav.

const route = useRoute()

const tabs = [
  { to: '/community',  label: 'Community',  prefix: '/community' },
  { to: '/builds',     label: 'My Builds',  prefix: '/builds'    },
  { to: '/favourites', label: 'Favourites', prefix: '/favourites' },
]

// `/builds/:id` (a build detail page) should still light "My Builds"
// even though it lives at a deeper path.
function isActive(prefix: string): boolean {
  return route.path === prefix || route.path.startsWith(prefix + '/')
}

const active = computed(() => tabs.find(t => isActive(t.prefix))?.to ?? '/community')
</script>

<template>
  <div class="builds-subnav">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="tab"
      :class="{ active: active === t.to }"
    >{{ t.label }}</RouterLink>
  </div>
</template>

<style scoped>
.builds-subnav {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  margin-bottom: 22px;
}
.tab {
  padding: 8px 16px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}
.tab:hover:not(.active) { color: var(--text); }
.tab.active {
  background: var(--text);
  color: var(--bg);
}
</style>
