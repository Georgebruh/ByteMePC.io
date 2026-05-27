<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSession, signOut } from '../lib/session'

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
const router = useRouter()
const { isSignedIn } = useSession()

// Avatar dropdown: Profile + Sign Out. Click-outside / Escape close
// it; the menu lives in the nav itself rather than teleported because
// it's small and the nav already escapes overflow.
const menuOpen = ref(false)
const menuEl = ref<HTMLElement | null>(null)

function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }

async function onSignOut() {
  closeMenu()
  await signOut()
  // After sign-out, kick the user back to the landing page so they're
  // never left staring at a screen their session no longer authorises.
  router.push('/')
}

function onDocPointerDown(ev: PointerEvent) {
  if (!menuOpen.value) return
  const t = ev.target as Node | null
  if (menuEl.value && t && menuEl.value.contains(t)) return
  closeMenu()
}
function onKey(ev: KeyboardEvent) { if (ev.key === 'Escape') closeMenu() }

watch(menuOpen, (open) => {
  if (open) {
    window.addEventListener('pointerdown', onDocPointerDown, true)
    window.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('pointerdown', onDocPointerDown, true)
    window.removeEventListener('keydown', onKey)
  }
})
// Close the menu whenever the route changes so it doesn't hang open
// after a nav click.
watch(() => route.fullPath, closeMenu)
onBeforeUnmount(closeMenu)

// Highlight a link if the current route matches one of its "owns" prefixes.
// We compare on path prefix so e.g. /parts/cpu-13900k still lights "Browse Parts".
function isActive(prefixes: string[]): boolean {
  return prefixes.some(p => route.path === p || route.path.startsWith(p + '/'))
}
 
// logo of ByteMePC, made by the GOAT
import logo from '../assets/logo.png'
  
// The avatar is the entry point to Profile + Sign Out, so it must
// follow the signed-in state across every screen — not the per-screen
// showAvatar prop. The prop only controls the anonymous case (auth
// screens hide it so the right-side CTA can take the slot instead).
const showAvatar = computed(() => isSignedIn.value || props.showAvatar !== false)

// Sign-in / Sign-up CTAs are only meaningful to anonymous viewers — once
// the user is signed in, suppress them so the nav doesn't double up on
// "Sign In" link + profile avatar.
const showSecondaryCta = computed(() => !!props.secondaryCta && !isSignedIn.value)
const showRightCta = computed(() => !!props.rightCta && props.showAvatar === false && !isSignedIn.value)
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
      <img class="logo-image" :src="logo">
      <span class="sigil-2"><span class="sigil">[</span>byte<em>me</em>pc<span class="sigil">]</span></span>
    </RouterLink>

    <!-- Tabs are wrapped in a bordered pill — the active tab inverts
         (white-on-dark) so it reads like a selected segment in a CLI
         tool, not a button. -->
    <div class="tabs">
      <RouterLink to="/"          :class="{ active: isActive(['/']) && route.path === '/' }">Workshop</RouterLink>
      <RouterLink to="/builder"   :class="{ active: isActive(['/builder']) }">Builder</RouterLink>
      <RouterLink to="/browse"    :class="{ active: isActive(['/browse', '/parts']) }">Catalog</RouterLink>
      <RouterLink to="/community" :class="{ active: isActive(['/community', '/builds', '/favourites']) }">Builds</RouterLink>
    </div>

    <div class="nav-right">
      <!-- Secondary right-side CTA (text-only link style). -->
      <RouterLink v-if="showSecondaryCta && secondaryCta" :to="secondaryCta.to" class="nav-cta">
        {{ secondaryCta.label }}
      </RouterLink>

      <!-- Right CTA when there's no avatar (sign-in, sign-up). -->
      <RouterLink v-if="showRightCta && rightCta" :to="rightCta.to" class="nav-cta primary">
        {{ rightCta.label }} <span class="arrow">→</span>
      </RouterLink>

      <!-- Avatar button + dropdown. Only shown to signed-in viewers so
           anonymous browsers don't see a profile shortcut that bounces
           straight back through the auth gate. The button doubles as the
           menu trigger — click to expose Profile + Sign Out. -->
      <div v-if="showAvatar && isSignedIn" ref="menuEl" class="avatar-wrap">
        <button
          type="button"
          class="avatar"
          :class="{ open: menuOpen }"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          title="Account menu"
          @click="toggleMenu"
        >G</button>

        <div v-if="menuOpen" class="avatar-menu" role="menu">
          <RouterLink
            to="/profile"
            class="menu-item"
            role="menuitem"
            @click="closeMenu"
          >
            <!-- Inline SVG (head + shoulders) so the glyph renders the
                 same on every OS / font instead of falling back to a
                 box when the colour-emoji font is missing. -->
            <svg class="mi-glyph" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="5.5" r="2.6" />
              <path d="M2.6 13.4 a5.4 5.4 0 0 1 10.8 0" />
            </svg>
            <span>Profile</span>
          </RouterLink>
          <button
            type="button"
            class="menu-item danger"
            role="menuitem"
            @click="onSignOut"
          >
            <!-- Door + arrow-out: the universal "log out" pictogram. -->
            <svg class="mi-glyph" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M9.5 2.5 H3.5 a1 1 0 0 0 -1 1 v9 a1 1 0 0 0 1 1 h6" />
              <path d="M10.5 5 L13.5 8 L10.5 11" />
              <line x1="6.5" y1="8" x2="13.5" y2="8" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
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
   Flex row for brand / right CTAs (space-between), with the tabs
   pill absolutely positioned at left: 50%. We tried grid with
   minmax(0, 1fr) side tracks first and the pill still drifted off
   true centre because the side tracks' intrinsic content nudged
   them in subpixel ways. Absolute positioning anchors the pill to
   the exact horizontal centre of the nav (= viewport centre, since
   padding is symmetric) regardless of side widths. */
.app-nav {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
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
  align-items: center;
  gap: 6px;
}
.sigil-2 {
  gap: 6px;
  display: inline-flex;
  align-items: baseline;
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
.logo-image {
  height: 25px;
}
/* Tabs sit inside a hairline container so the whole unit reads as
   one segmented control rather than four floating links. Absolutely
   positioned so the pill is dead-centred on the nav regardless of
   how wide the brand or right-CTA columns become. */
.tabs {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
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

/* ─── Avatar + dropdown ─────────────────────────────────────────── */
.avatar-wrap {
  position: relative;
}
/* Button variant of the global .avatar — strip default button chrome
   so the disc renders cleanly, then layer an "open" ring on top of the
   shared hover state. */
button.avatar {
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  font-family: var(--mono);
}
button.avatar.open {
  border-color: var(--cyan);
  color: #e7fbff;
  box-shadow:
    inset 0 0 10px rgba(0, 212, 255, 0.18),
    0 0 0 3px rgba(0, 212, 255, 0.22);
}

.avatar-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  min-width: 180px;
  padding: 4px;
  background: rgba(5, 8, 16, 0.96);
  border: 1px solid var(--cyan);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(34, 211, 238, 0.18);
  font-family: var(--mono);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
}
.menu-item:hover {
  background: rgba(34, 211, 238, 0.08);
  border-color: var(--line);
  color: var(--cyan);
}
.menu-item.danger { color: var(--red); }
.menu-item.danger:hover {
  background: rgba(255, 70, 85, 0.06);
  border-color: rgba(255, 70, 85, 0.35);
  color: var(--red);
}
/* Inline SVG icons — sized + colour-inherited so they pick up the
   row's text colour on hover and on the destructive .danger variant. */
.mi-glyph {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  fill: none;
  stroke: var(--text-mute);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.12s;
}
.menu-item:hover .mi-glyph { stroke: currentColor; }
.menu-item.danger .mi-glyph { stroke: var(--red); }

/* ─── Mobile ─────────────────────────────────────────────────────
   Collapse the grid into a wrapping flex and let the tabs drop to
   their own full-width row so nothing overlaps on narrow screens. */
@media (max-width: 900px) {
  .status-strip { padding: 6px 20px; gap: 10px; overflow-x: auto; }
  .app-nav {
    flex-wrap: wrap;
    padding: 14px 20px;
    gap: 12px;
  }
  /* Drop the absolute positioning on mobile — the tabs drop to
     their own full-width row instead so they don't overlap the
     brand or right CTA on narrow screens. */
  .tabs {
    position: static;
    transform: none;
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
</style>
