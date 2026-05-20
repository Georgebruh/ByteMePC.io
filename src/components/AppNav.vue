<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

// The main top bar shown on (almost) every screen. Two modes are
// supported via props so the auth screens can hide the avatar / show
// just a single CTA without needing a second component.
//
// The redesign also adds an optional `statusStrip` rendered above the
// nav itself — that's the engineer's-log style ticker the landing page
// uses to set the "workshop / control panel" tone. Inner screens leave
// it off to keep their chrome quiet.
const props = defineProps<{
  // Show the user avatar on the right? Default true.
  // The landing + auth screens override this.
  showAvatar?: boolean
  // Which link to render on the right when there is no avatar
  // (e.g. "Sign Up" on the sign-in page).
  rightCta?: { label: string; to: string }
  // Optional secondary CTA shown before the primary one (used on landing).
  secondaryCta?: { label: string; to: string }
  // Render the engineer's-log status strip above the nav?
  // The landing page sets this; inner screens omit it.
  statusStrip?: boolean
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
  <!--
    Optional status strip — opt-in via the statusStrip prop.
    Reads like an ops bar: live node, builder count, last index time,
    deploy region. Only the dot animates (every few seconds) so the
    eye isn't drawn here permanently.
  -->
  <div v-if="statusStrip" class="status-strip" aria-hidden="true">
    <span class="dot"></span>
    <span class="lbl">NODE · ONLINE</span>
    <span class="sep">/</span>
    <span class="lbl">2,118 ENGINEERS BUILDING NOW</span>
    <span class="sep">/</span>
    <span class="lbl">LAST INDEX 02:14:07 GMT</span>
    <span class="grow"></span>
    <span class="lbl">DB · v0.42.1</span>
    <span class="sep">/</span>
    <span class="lbl">EU-WEST-3</span>
  </div>

  <nav class="app-nav">
    <!-- Brand on the left. Square-bracket sigils + italic "me" gives
         the wordmark a code-syntax feel without yelling. -->
    <RouterLink to="/" class="logo">
      <span class="sigil">[</span>byte<em>me</em>pc<span class="sigil">]</span>
    </RouterLink>

    <!-- Tabs are wrapped in a bordered pill — the active tab inverts
         (white-on-dark) so it reads like a selected segment in a CLI
         tool, not a button. -->
    <div class="tabs">
      <RouterLink to="/"          :class="{ active: isActive(['/']) && route.path === '/' }">Workshop</RouterLink>
      <RouterLink to="/builder"   :class="{ active: isActive(['/builder']) }">Builder</RouterLink>
      <RouterLink to="/browse"    :class="{ active: isActive(['/browse', '/parts']) }">Catalog</RouterLink>
      <RouterLink to="/community" :class="{ active: isActive(['/community', '/builds']) }">Field Notes</RouterLink>
    </div>

    <div class="nav-right">
      <!-- Secondary right-side CTA (text-only link style). -->
      <RouterLink v-if="secondaryCta" :to="secondaryCta.to" class="nav-cta">
        {{ secondaryCta.label }}
      </RouterLink>

      <!-- Right CTA when there's no avatar (sign-in, sign-up). -->
      <RouterLink v-if="rightCta && !showAvatar" :to="rightCta.to" class="nav-cta primary">
        {{ rightCta.label }} <span class="arrow">→</span>
      </RouterLink>

      <!-- Avatar shortcut to the profile screen. -->
      <RouterLink v-if="showAvatar" to="/profile" class="avatar" title="Profile">G</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
/* ─── Status strip ────────────────────────────────────────────────
   Slim "ops bar" rendered above the nav on the landing page. Uses
   the mono font and high tracking so it reads like a log line. */
.status-strip {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 60px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
  border-bottom: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.7);
  backdrop-filter: blur(6px);
}
.status-strip .grow { flex: 1; }
.status-strip .sep  { color: rgba(255, 255, 255, 0.08); }
.status-strip .lbl  { white-space: nowrap; }
/* Pulsing green dot — the only thing in the strip that moves. */
.status-strip .dot {
  width: 6px;
  height: 6px;
  background: var(--green);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--green);
  animation: term-blink 2.4s ease-in-out infinite;
}
@keyframes term-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

/* ─── Main nav ───────────────────────────────────────────────────
   3-column grid (brand / tabs / right) so the tabs pill always sits
   dead-center on the page regardless of how wide each side gets. */
.app-nav {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 16px 60px;
  border-bottom: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.7);
  backdrop-filter: blur(8px);
}

/* Brand wordmark — Space Grotesk for weight, mono brackets for the
   "this is a CLI tool" wink. */
.logo {
  font-family: var(--display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.logo .sigil {
  font-family: var(--mono);
  font-weight: 400;
  font-size: 15px;
  color: var(--cyan);
}
.logo em {
  font-style: italic;
  color: var(--cyan);
  font-family: var(--display);
}

/* Tabs sit inside a hairline container so the whole unit reads as
   one segmented control rather than four floating links. */
.tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  justify-self: center;
}
.tabs a {
  padding: 7px 16px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  transition: color 0.15s, background 0.15s;
}
.tabs a:hover { color: var(--text); }
/* Active tab inverts — white block, dark text — the CLI-segment look. */
.tabs a.active {
  background: var(--text);
  color: var(--bg);
}

/* Right column: ghost link(s) + optional primary CTA + avatar. */
.nav-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  background: transparent;
  border: 1px solid var(--line);
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.nav-cta:hover {
  color: var(--cyan);
  border-color: rgba(0, 212, 255, 0.35);
}
/* Primary CTA = filled cyan block (the "Get Started" / "Get Bench" button).
   No more clip-path gradient — the terminal aesthetic favours solid blocks. */
.nav-cta.primary {
  background: var(--cyan);
  color: var(--bg);
  border-color: var(--cyan);
  font-weight: 700;
}
.nav-cta.primary:hover {
  filter: drop-shadow(0 0 14px rgba(0, 212, 255, 0.45));
  background: #2ddfff;
}
.nav-cta .arrow { transition: transform 0.15s; }
.nav-cta:hover .arrow { transform: translateX(3px); }

/* ─── Mobile ─────────────────────────────────────────────────────
   Collapse the grid into a wrapping flex and let the tabs drop to
   their own full-width row so nothing overlaps on narrow screens. */
@media (max-width: 900px) {
  .status-strip { padding: 6px 20px; gap: 10px; overflow-x: auto; }
  .app-nav {
    display: flex;
    flex-wrap: wrap;
    padding: 14px 20px;
    gap: 12px;
  }
  .tabs {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
</style>
