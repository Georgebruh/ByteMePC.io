<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

// The main top bar shown on (almost) every screen. Two modes are
// supported via props so the auth screens can hide the avatar / show
// just a single CTA without needing a second component.
const props = defineProps<{
  // Show the user avatar on the right? Default true.
  // The landing + auth screens override this.
  showAvatar?: boolean
  // Which link to render on the right when there is no avatar
  // (e.g. "Sign Up" on the sign-in page).
  rightCta?: { label: string; to: string }
  // Optional secondary CTA shown before the primary one (used on landing).
  secondaryCta?: { label: string; to: string }
}>()

const route = useRoute()

// Highlight a link if the current route matches one of its "owns" prefixes.
// We compare on path prefix so e.g. /parts/cpu-13900k still lights "Browse Parts".
function isActive(prefixes: string[]): boolean {
  return prefixes.some(p => route.path === p || route.path.startsWith(p + '/'))
}

const showAvatar = computed(() => props.showAvatar !== false)
</script>

<template>
  <nav class="app-nav">
    <RouterLink to="/" class="logo">byte<span>me</span>pc</RouterLink>

    <ul class="navlinks">
      <li><RouterLink to="/" :class="{ active: isActive(['/']) && route.path === '/' }">Home</RouterLink></li>
      <li><RouterLink to="/builder" :class="{ active: isActive(['/builder']) }">Builder</RouterLink></li>
      <li><RouterLink to="/browse" :class="{ active: isActive(['/browse', '/parts']) }">Browse Parts</RouterLink></li>
      <li><RouterLink to="/community" :class="{ active: isActive(['/community', '/builds']) }">Community</RouterLink></li>
    </ul>

    <div class="nav-right">
      <!-- Secondary right-side CTA (text-only link style). -->
      <RouterLink v-if="secondaryCta" :to="secondaryCta.to" class="nav-cta">
        {{ secondaryCta.label }}
      </RouterLink>

      <!-- Right CTA when there's no avatar (sign-in, sign-up). -->
      <RouterLink v-if="rightCta && !showAvatar" :to="rightCta.to" class="nav-cta primary">
        {{ rightCta.label }}
      </RouterLink>

      <!-- Avatar shortcut to the profile screen. -->
      <RouterLink v-if="showAvatar" to="/profile" class="avatar" title="Profile">G</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 60px;
  border-bottom: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.6);
  backdrop-filter: blur(8px);
}

/* Logo — gradient on "byte", solid white on "me", muted on "pc". */
.logo {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: var(--grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo span {
  color: #fff;
  -webkit-text-fill-color: #fff;
}

.navlinks {
  display: flex;
  gap: 28px;
  list-style: none;
}
.navlinks a {
  color: var(--text-dim);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: color 0.2s;
}
.navlinks a:hover { color: var(--cyan); }
.navlinks a.active { color: var(--cyan); }

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-cta {
  padding: 9px 22px;
  background: transparent;
  border: 1px solid var(--cyan);
  color: var(--cyan);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  border-radius: 3px;
  clip-path: var(--clip);
  transition: filter 0.2s;
}
.nav-cta.primary {
  background: var(--grad);
  color: var(--bg);
  border: none;
}
.nav-cta:hover { filter: brightness(1.1); }

@media (max-width: 900px) {
  .app-nav { padding: 14px 20px; gap: 12px; flex-wrap: wrap; }
  .navlinks { gap: 16px; order: 3; width: 100%; justify-content: center; }
}
</style>
