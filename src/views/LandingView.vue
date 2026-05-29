<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppNav from '../components/AppNav.vue'
import { fetchTopFavouritedBuilds } from '../data/builds'
import type { Build } from '../data/mock'


type SpecRow = { k: string; v: string; p: string }
type FeaturedBuild = {
  id: string
  name: string
  builder: string
  pins: number
  total: string
  parts: number
  rows: SpecRow[]
}

// PHP formatter for the spec card's price column. Prices coming back from
// fetchTopFavouritedBuilds are already converted to PHP at the data boundary.
const phpFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
})

// Featured builds are fetched from Supabase (top 3 by favourite count via
// the top_favourited_builds RPC). Until the fetch resolves we show a single
// placeholder slide so the carousel frame stays put.
const PLACEHOLDER: FeaturedBuild = {
  id: '',
  name: 'Loading…',
  builder: '@—',
  pins: 0,
  total: '₱0',
  parts: 0,
  rows: [
    { k: 'CPU', v: '—', p: '—' },
    { k: 'GPU', v: '—', p: '—' },
    { k: 'RAM', v: '—', p: '—' },
  ],
}
const featured = ref<FeaturedBuild[]>([PLACEHOLDER])

// Reduce a fetched Build to the 5 rows the spec card shows: CPU, GPU,
// RAM, the first storage row, PSU. We tag-match instead of relying on
// slot order so a build missing a slot just drops that row.
function buildToFeatured(b: Build): FeaturedBuild {
  const want = ['CPU', 'GPU', 'RAM', 'STORAGE', 'PSU']
  const rows: SpecRow[] = []
  for (const tag of want) {
    const p = b.parts.find(x => x.tag === tag)
    if (!p) continue
    rows.push({
      k: tag === 'STORAGE' ? 'SSD' : tag,
      v: p.name,
      p: phpFmt.format(p.price),
    })
  }
  return {
    id: b.id,
    name: b.name,
    builder: b.user,
    pins: b.views,
    total: phpFmt.format(b.totalPrice),
    parts: b.parts.length,
    rows,
  }
}

// ─── Carousel state ──────────────────────────────────────────────
// `activeIdx` is the slide on screen. `progress` (0 → 1) drives the
// type-in animation: every text field shows the first
// ceil(len * progress) characters of its real value, so the whole
// card reveals together like a console teleprinting.
const activeIdx = ref(0)
const progress = ref(1)
const active = computed(() => featured.value[activeIdx.value] ?? PLACEHOLDER)

function typedSlice(s: string): string {
  return s.slice(0, Math.ceil(s.length * progress.value))
}
const typedName    = computed(() => typedSlice(active.value.name))
const typedBuilder = computed(() => typedSlice(active.value.builder))
const typedTotal   = computed(() => typedSlice(active.value.total))
const typedRows  = computed(() =>
  active.value.rows.map(r => ({
    k: r.k,
    v: typedSlice(r.v),
    p: typedSlice(r.p),
  })),
)

let cycleTimer: ReturnType<typeof setInterval> | null = null
let animFrame: number | null = null
function animateIn() {
  const start = performance.now()
  const dur = 620
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur)
    progress.value = t
    if (t < 1) animFrame = requestAnimationFrame(tick)
    else animFrame = null
  }
  animFrame = requestAnimationFrame(tick)
}

function goTo(i: number) {
  if (i === activeIdx.value) return
  if (animFrame) cancelAnimationFrame(animFrame)
  activeIdx.value = i
  progress.value = 0
  animateIn()
}
function restartCycle() {
  if (cycleTimer) clearInterval(cycleTimer)
  if (featured.value.length < 2) return
  cycleTimer = setInterval(() => {
    goTo((activeIdx.value + 1) % featured.value.length)
  }, 5200)
}
function jumpTo(i: number) {
  goTo(i)
  restartCycle()
}

// ─── Cursor-tracked spotlight ─────────────────────────────────────
// The aurora background does the heavy lifting; this layer just adds a
// soft cyan spotlight that tracks the pointer, so motion still responds
// to the user instead of running on a fixed timeline alone.
const rootEl = ref<HTMLElement | null>(null)
const trailEl = ref<HTMLElement | null>(null)
function onPointerMove(e: PointerEvent) {
  if (!rootEl.value) return
  rootEl.value.style.setProperty('--mx', `${e.clientX}px`)
  rootEl.value.style.setProperty('--my', `${e.clientY}px`)
  // The trail node chases the cursor through a CSS transition so it
  // lags behind for a soft comet tail. translate(-50%) centres the
  // blob on the pointer.
  if (trailEl.value) {
    trailEl.value.style.transform =
      `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`
  }
}

async function loadFeatured() {
  try {
    const rows = await fetchTopFavouritedBuilds(3)
    if (!rows.length) return
    featured.value = rows.map(buildToFeatured)
    activeIdx.value = 0
    progress.value = 0
    animateIn()
    restartCycle()
  } catch (e) {
    // Leave the placeholder up if Supabase is unreachable — the rest of
    // the landing chrome (modules, ticker, nav) doesn't depend on this.
    console.error('Featured builds failed to load', e)
  }
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    progress.value = 1
  } else {
    animateIn()
    restartCycle()
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  loadFeatured()
})
onBeforeUnmount(() => {
  if (cycleTimer) clearInterval(cycleTimer)
  if (animFrame) cancelAnimationFrame(animFrame)
  window.removeEventListener('pointermove', onPointerMove)
})

// Three "modules" — feature cards framed as numbered system entries.
type Module = {
  id: 'smart' | 'budget' | 'community'
  num: string
  title: string
  desc: string
  cta: string
  to: string
  tone: 'cyan' | 'amber' | 'red'
}
const modules: Module[] = [
  {
    id: 'smart',
    num: '// 01',
    title: 'Compatibility, on every click.',
    desc: 'Socket, TDP, RAM, PCIe, GPU clearance — checked before you commit.',
    cta: 'Open Builder',
    to: '/builder/manual',
    tone: 'cyan',
  },
  {
    id: 'budget',
    num: '// 02',
    title: 'Spend the budget, not the weekend.',
    desc: 'Type a number. Get a curated, in-stock, fully compatible build.',
    cta: 'Auto-Build',
    to: '/builder/auto',
    tone: 'amber',
  },
  {
    id: 'community',
    num: '// 03',
    title: 'Steal from real builders.',
    desc: 'Hundreds of vetted community builds. Fork, swap, deploy.',
    cta: 'Field Notes',
    to: '/community',
    tone: 'red',
  },
]

// Live parts-price ticker — frozen for the mockup. Once the parts API
// is wired the deltas can become reactive without changing the view.
type Tick = { name: string; price: string; delta: string; dir: 'up' | 'dn' }
const ticks: Tick[] = [
  { name: '9800X3D',        price: '$479', delta: '2.1%', dir: 'dn' },
  { name: 'RTX 5080',       price: '$999', delta: '0.4%', dir: 'up' },
  { name: 'DDR5-6000 32GB', price: '$118', delta: '4.0%', dir: 'dn' },
  { name: 'T705 2TB',       price: '$214', delta: '1.2%', dir: 'up' },
  { name: 'RM850x',         price: '$139', delta: '0.0%', dir: 'up' },
  { name: 'O11D Evo XL',    price: '$229', delta: '1.7%', dir: 'dn' },
  { name: '14700K',         price: '$349', delta: '0.9%', dir: 'dn' },
  { name: 'RX 7900 XTX',    price: '$769', delta: '3.2%', dir: 'dn' },
]
</script>

<template>
  <!-- The landing page is a single-viewport experience: the outer
       .landing fills exactly 100vh and prevents page scroll so the
       chrome + hero + modules + ticker all sit above the fold. -->
  <div ref="rootEl" class="landing">

    <!-- Layered aurora background. Three slow-drifting colour blobs +
         a cursor-tracked cyan spotlight on top. All layers sit behind
         the page content (z-index: 0) and are inert (pointer-events
         none) so they never interfere with clicks/hover. -->
    <div class="aurora" aria-hidden="true">
      <span class="blob blob-cyan"></span>
      <span class="blob blob-purple"></span>
      <span class="blob blob-amber"></span>
    </div>
    <div class="cursor-glow" aria-hidden="true"></div>
    <div ref="trailEl" class="cursor-trail" aria-hidden="true"></div>

    <!-- Status strip removed — irrelevant ops info, not wired up.
         Avatar visibility is left to AppNav's default (show when signed
         in, hide otherwise). The Sign In secondary CTA self-hides for
         signed-in viewers so the right-side slot doesn't double up. -->
    <AppNav :secondary-cta="{ label: 'Sign In', to: '/sign-in' }" />

    <!-- The main column is a 3-row grid: hero takes the remaining
         space (1fr), modules + ticker collapse to their natural
         height (auto). That distributes the viewport cleanly without
         hard-coding heights. -->
    <main class="main">

      <!-- ─── Hero ──────────────────────────────────────────────── -->
      <section class="hero">
        <div class="hero-copy">
          <h1 class="title">
            <span class="dim">//</span> Engineer the
            <span class="accent">machine</span> you keep
            <span class="strike">overthinking</span>.
          </h1>

          <p class="lede">
            Pick parts. Stay compatible. Price in <strong>PHP</strong>.
          </p>

          <div class="actions">
            <RouterLink to="/builder" class="t-btn primary">
              <span>Start Building</span>
              <span class="arrow">→</span>
            </RouterLink>
            <RouterLink to="/community" class="t-btn">
              <span>Browse Builds</span>
            </RouterLink>
          </div>
        </div>

        <!-- Spec sheet card — now a carousel: the frame stays put,
             only the text fields inside type in on each slide. The
             carousel indicator (segmented bars) sits below the card. -->
        <div class="featured-carousel">
          <aside class="specsheet">
            <span class="corner"></span>
            <h4>
              Featured Build
              <span>↑ {{ active.pins }} views</span>
            </h4>

            <div class="build-id">
              <RouterLink
                v-if="active.id"
                :to="`/builds/${active.id}`"
                class="build-name typed"
              >{{ typedName }}</RouterLink>
              <span v-else class="build-name typed">{{ typedName }}</span>
              <span class="build-builder typed">by {{ typedBuilder }}</span>
            </div>

            <div
              v-for="(r, i) in typedRows"
              :key="`${activeIdx}-${r.k}`"
              class="spec-row"
              :style="{ animationDelay: `${i * 40}ms` }"
            >
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
              <span class="p">{{ r.p }}</span>
            </div>

            <div class="spec-foot">
              <div>
                <div class="foot-lbl">TOTAL · PHP</div>
                <div class="foot-sub">{{ active.parts }} parts · compat ✓</div>
              </div>
              <div class="total typed">{{ typedTotal }}</div>
            </div>
          </aside>

          <!-- Carousel indicator — hairline bars, the active one
               widens and fills cyan. Click to jump to that build. -->
          <div class="dots" role="tablist" aria-label="Featured build carousel">
            <button
              v-for="(b, i) in featured"
              :key="b.id || `placeholder-${i}`"
              type="button"
              class="dot"
              :class="{ active: i === activeIdx }"
              :aria-label="`Featured build ${i + 1} of ${featured.length}`"
              :aria-selected="i === activeIdx"
              @click="jumpTo(i)"
            ></button>
          </div>
        </div>
      </section>

      <!-- ─── Modules row ──────────────────────────────────────────
           Compact 3-up grid. Cards lose their padding-heavy "marketing
           tile" feel and become inline directory entries instead. -->
      <section class="modules">
        <RouterLink
          v-for="m in modules"
          :key="m.id"
          :to="m.to"
          class="mod"
          :class="`tone-${m.tone}`"
        >
          <!-- Per-module inline SVG. currentColor lets the tone class
               on the parent recolour both the icon and the CTA.
               Manual ('smart') uses the wrench and Auto ('budget') uses
               the zap — matched to the icons on the Builder hub. -->
          <svg
            v-if="m.id === 'smart'"
            class="ic" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <svg
            v-else-if="m.id === 'budget'"
            class="ic" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <svg
            v-else
            class="ic" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <circle cx="12" cy="5" r="2.4" />
            <circle cx="5"  cy="18" r="2.4" />
            <circle cx="19" cy="18" r="2.4" />
            <path d="M10.7 6.9 6.3 15.7M13.3 6.9l4.4 8.8M7.4 18h9.2" />
          </svg>

          <div class="mod-text">
            <div class="num">{{ m.num }}</div>
            <h3>{{ m.title }}</h3>
            <p>{{ m.desc }}</p>
          </div>

          <span class="open">{{ m.cta }} <span class="arrow">→</span></span>
        </RouterLink>
      </section>

      <!-- ─── Live ticker ───────────────────────────────────────────
           Pinned to the bottom of the viewport. Items are duplicated
           in the template so the marquee can wrap without a snap. -->
      <div class="ticker" aria-hidden="true">
        <div class="scroll">
          <template v-for="pass in 2" :key="pass">
            <span v-for="t in ticks" :key="`${pass}-${t.name}`" class="tick">
              <b>{{ t.name }}</b>
              {{ t.price }}
              <em :class="`delta-${t.dir}`">
                {{ t.dir === 'up' ? '↑' : '↓' }} {{ t.delta }}
              </em>
            </span>
          </template>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
/* ─── Page shell ──────────────────────────────────────────────────
   Exactly 100vh tall, no scroll. The chrome (status + nav) lives
   inside this height; .main takes the remainder via flex/grid. */
.landing {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ─── Aurora ──────────────────────────────────────────────────────
   Three big, very-blurred colour blobs drift slowly across the
   viewport on independent loops. Together they read as a living
   "workshop ambient light" instead of the previous flat gradient.
   Everything is fixed + pointer-events:none + behind content. */
.aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* Soft additive lift on top of the body grid + radial glow. */
  mix-blend-mode: screen;
}
.aurora .blob {
  position: absolute;
  width: 60vmax;
  height: 60vmax;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform, opacity;
}
.aurora .blob-cyan {
  background: radial-gradient(circle, rgba(0, 212, 255, 0.55), transparent 65%);
  top: -20vmax;
  left: -15vmax;
  /* Long loop (45s) with many keyframe stops so the path isn't a
     straight A→B oscillation. Each stop nudges in a different
     direction, giving the blob an organic, living drift. `infinite`
     (not `alternate`) so the loop is a closed circuit instead of
     bouncing back along the same line. */
  animation: aurora-drift-a 48s ease-in-out infinite;
}
.aurora .blob-purple {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.55), transparent 65%);
  bottom: -25vmax;
  right: -20vmax;
  animation: aurora-drift-b 62s ease-in-out infinite;
}
.aurora .blob-amber {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.32), transparent 65%);
  top: 20vmax;
  right: 10vmax;
  width: 45vmax;
  height: 45vmax;
  animation: aurora-drift-c 74s ease-in-out infinite;
}

/* Multi-stop keyframes — each blob wanders in a small loop and gently
   pulses scale + opacity so it reads as "breathing" rather than
   scripted. Keep the magnitudes small (~10vw / ±0.1 scale) so the
   motion is felt, not noticed. */
@keyframes aurora-drift-a {
  0%   { transform: translate(0, 0)        scale(1);    opacity: 0.50; }
  20%  { transform: translate(6vw, 4vh)    scale(1.06); opacity: 0.58; }
  40%  { transform: translate(10vw, 9vh)   scale(1.10); opacity: 0.55; }
  60%  { transform: translate(4vw, 12vh)   scale(1.04); opacity: 0.62; }
  80%  { transform: translate(-3vw, 6vh)   scale(0.96); opacity: 0.52; }
  100% { transform: translate(0, 0)        scale(1);    opacity: 0.50; }
}
@keyframes aurora-drift-b {
  0%   { transform: translate(0, 0)         scale(1);    opacity: 0.50; }
  25%  { transform: translate(-7vw, -4vh)   scale(1.08); opacity: 0.58; }
  50%  { transform: translate(-10vw, -10vh) scale(1.14); opacity: 0.55; }
  75%  { transform: translate(-3vw, -12vh)  scale(1.02); opacity: 0.60; }
  100% { transform: translate(0, 0)         scale(1);    opacity: 0.50; }
}
@keyframes aurora-drift-c {
  0%   { transform: translate(0, 0)        scale(1);    opacity: 0.36; }
  20%  { transform: translate(-6vw, 5vh)   scale(1.08); opacity: 0.42; }
  45%  { transform: translate(-11vw, 8vh)  scale(1.15); opacity: 0.40; }
  70%  { transform: translate(-4vw, -3vh)  scale(1.05); opacity: 0.46; }
  100% { transform: translate(0, 0)        scale(1);    opacity: 0.36; }
}

/* ─── Cursor reticle ──────────────────────────────────────────────
   Two layers, both pointer-events:none and behind content:
     .cursor-glow  — wide cyan→purple radial, tracks 1:1
     .cursor-trail — soft amber blob that LAGS behind for a tail
   No mix-blend-mode here — the aurora already screens onto the body
   grid; stacking another blend layer washed out the page. */
.cursor-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(
      520px circle at var(--mx, 50%) var(--my, 50%),
      rgba(0, 212, 255, 0.28) 0%,
      rgba(168, 85, 247, 0.14) 35%,
      transparent 62%
    );
}

.cursor-trail {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.20) 0%,
    rgba(168, 85, 247, 0.12) 40%,
    transparent 70%
  );
  /* Lag is the whole point — slow easing so it trails like a comet. */
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

/* Note: the cyan blueprint grid is drawn globally on <body> in
   style.css. The landing used to layer its own 40px grid on top
   via .landing::before — that doubled up with the body grid and
   produced a visible moiré/duplication. Removed so only the global
   grid shows through. */

/* Main column distributes its height: hero stretches (1fr), modules
   and ticker take their natural size. */
.main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: 1fr auto auto;
  padding: 0 60px;
  font-family: var(--mono);
}

/* ─── Hero ────────────────────────────────────────────────────────
   Left = headline + lede + actions. Right = spec sheet card.
   The 1.3 : 1 split gives the title room without dwarfing the
   card. align-items: center vertically centres both columns inside
   the 1fr row. */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 48px;
  align-items: center;
  padding: 28px 0;
  min-height: 0;
}

.hero-copy { min-width: 0; }

/* Headline — Space Grotesk display weight, clamped so it shrinks
   gracefully on smaller laptops without forcing a scroll. */
h1.title {
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(38px, 4.8vw, 64px);
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--text);
  margin-bottom: 18px;
}
h1.title .dim    { color: var(--text-low); font-weight: 500; }
h1.title .accent { color: var(--cyan); }
/* Hand-drawn-feeling amber bar struck through "overthinking" — the
   single most "this was designed, not generated" touch. */
h1.title .strike {
  position: relative;
  display: inline-block;
}
h1.title .strike::after {
  content: '';
  position: absolute;
  left: -3%;
  right: -3%;
  top: 56%;
  height: 3px;
  background: var(--amber);
  transform: rotate(-2deg);
}

.lede {
  font-family: var(--display);
  font-size: 15px;
  color: var(--text-dim);
  line-height: 1.5;
  max-width: 52ch;
  margin-bottom: 22px;
}
.lede strong { color: var(--text); font-weight: 500; }

/* ─── Buttons (terminal flavour) ─────────────────────────────────
   Scoped to .t-btn so they don't clash with the global .btn-primary
   / .btn-ghost the rest of the app uses. */
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.t-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}
.t-btn:hover {
  border-color: rgba(0, 212, 255, 0.35);
  background: rgba(0, 212, 255, 0.05);
}
.t-btn.primary {
  background: var(--cyan);
  color: var(--bg);
  border-color: var(--cyan);
  font-weight: 700;
}
.t-btn.primary:hover {
  background: #2ddfff;
  filter: drop-shadow(0 0 18px rgba(0, 212, 255, 0.5));
}
.t-btn .arrow { transition: transform 0.2s; }
.t-btn:hover .arrow { transform: translateX(3px); }

/* ─── Featured carousel ────────────────────────────────────────── */
.featured-carousel {
  display: flex;
  flex-direction: column;
  align-self: center;
  gap: 14px;
}

/* ─── Spec sheet ──────────────────────────────────────────────────
   Corner brackets are 4 pseudo-elements with only two borders each
   — cheap "blueprint excerpt" frame without an SVG overlay. */
.specsheet {
  position: relative;
  border: 1px solid var(--line);
  background: rgba(10, 18, 32, 0.6);
  padding: 18px 20px;
  font-family: var(--mono);
  font-size: 12px;
  backdrop-filter: blur(4px);
}
.specsheet::before,
.specsheet::after,
.specsheet > .corner::before,
.specsheet > .corner::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid var(--cyan);
}
.specsheet::before { top: -1px; left: -1px;  border-right: none; border-bottom: none; }
.specsheet::after  { top: -1px; right: -1px; border-left: none;  border-bottom: none; }
.specsheet > .corner::before { bottom: -1px; left: -1px;  border-right: none; border-top: none; }
.specsheet > .corner::after  { bottom: -1px; right: -1px; border-left: none;  border-top: none; }

.specsheet h4 {
  font-family: var(--mono);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cyan);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
}
.specsheet h4 span { color: var(--text-low); }
/* The typed substrings carry a faint cyan glow + visible caret so the
   "teleprinting" effect reads even after the text settles. */
.specsheet .typed {
  position: relative;
}

/* Build identity — name + author. Sits between the section heading
   and the spec rows; name is display-weighted, author drops to mono
   so the two read as a citation. */
.specsheet .build-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--line);
}
.specsheet .build-name {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text);
  text-decoration: none;
  line-height: 1.15;
}
a.specsheet,
.specsheet a.build-name:hover { color: var(--cyan); }
.specsheet .build-builder {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.04em;
}

.spec-row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: baseline;
  padding: 6px 0;
  /* Dashed dividers between part lines — looks like a perforated
     dispatch slip, not a generic table. */
  border-top: 1px dashed var(--line);
  font-size: 12px;
}
.spec-row:first-of-type { border-top: none; padding-top: 0; }
.spec-row .k { color: var(--text-low); letter-spacing: 0.06em; }
.spec-row .v { color: var(--text); }
.spec-row .p { color: var(--amber); font-weight: 500; }

.spec-foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: var(--text-low);
}
.spec-foot .foot-lbl { letter-spacing: 0.1em; }
.spec-foot .foot-sub { font-size: 9px; color: var(--text-low); margin-top: 2px; }
.spec-foot .total {
  font-family: var(--display);
  color: var(--cyan);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ─── Carousel indicator ──────────────────────────────────────────
   Hairline segmented bars under the card. Active bar widens and
   fills cyan — reads as a CLI progress strip, matches the theme. */
.dots {
  display: inline-flex;
  gap: 8px;
  align-self: center;
}
.dot {
  width: 22px;
  height: 4px;
  background: transparent;
  border: 1px solid var(--line);
  padding: 0;
  cursor: pointer;
  border-radius: 0;
  transition: width 0.25s ease, background 0.2s, border-color 0.2s,
              box-shadow 0.25s;
}
.dot:hover { border-color: rgba(0, 212, 255, 0.45); }
.dot.active {
  width: 38px;
  background: var(--cyan);
  border-color: var(--cyan);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.45);
}

/* ─── Modules row ─────────────────────────────────────────────────
   Single short row of three cards. Each is laid out with the icon
   on the left, copy in the middle, CTA on the right — so the cell
   is wide-and-short instead of tall, fitting under the hero. */
.modules {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.mod {
  background: var(--bg);
  padding: 24px 22px 20px;
  position: relative;
  color: inherit;
  text-decoration: none;
  transition: background 0.2s;
  /* Taller layout: icon block on the left + body on the right. The
     body uses its own internal flex column so the CTA pins to the
     bottom edge — every card lines up on the "Open Builder" baseline
     regardless of title/description length. */
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 18px;
  min-height: 150px;
}
.mod:hover { background: var(--bg-2); }

/* Icon is now framed in the signature hex-clipped tile — same
   angled clip-path the rest of the Forge UI uses for buttons. */
.mod .ic {
  width: 40px;
  height: 40px;
  color: var(--cyan);
  padding: 7px;
  border: 1px solid rgba(0, 212, 255, 0.35);
  background: rgba(0, 212, 255, 0.05);
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  align-self: start;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.25s, box-shadow 0.25s;
}
.mod:hover .ic {
  transform: scale(1.08);
  border-color: var(--cyan);
  box-shadow: 0 0 16px -4px rgba(0, 212, 255, 0.5);
}

/* Body column — flex so the CTA can be pushed to the bottom while
   title + description stay snug under the row label. */
.mod-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.mod-text .num {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.16em;
  margin-bottom: 6px;
}
.mod h3 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 17px;
  line-height: 1.18;
  letter-spacing: -0.015em;
  color: var(--text);
  margin-bottom: 6px;
}
.mod p {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--text-dim);
  line-height: 1.5;
  /* Allow up to 2 lines, then clamp — gives breathing room without
     letting one long description stretch the whole row vertically.
     Both -webkit- and the standard `line-clamp` are set; the standard
     property is needed for current spec compliance / future browsers. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mod .open {
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--cyan);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mod .open .arrow {
  display: inline-block;
  transition: transform 0.2s;
}
.mod:hover .open .arrow { transform: translateX(4px); }

/* Per-module accent — tone matches the icon AND the CTA so each
   card reads as its own channel. */
.mod.tone-amber .ic,
.mod.tone-amber .open { color: var(--amber); }
.mod.tone-red   .ic,
.mod.tone-red   .open { color: var(--red); }

/* ─── Live ticker ─────────────────────────────────────────────────
   Items duplicated in the template (v-for over `pass in 2`) so the
   -50% translate seam lands on an identical tick. */
.ticker {
  padding: 10px 0;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  /* Fade the edges so ticks don't pop in/out abruptly. */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
}
.ticker .scroll {
  display: inline-flex;
  gap: 40px;
  white-space: nowrap;
  animation: ticker-scroll 40s linear infinite;
}
.ticker .tick { display: inline-flex; align-items: baseline; gap: 8px; }
.ticker b         { color: var(--cyan); font-weight: 500; }
.ticker .delta-up { color: var(--green); font-style: normal; }
.ticker .delta-dn { color: var(--red);   font-style: normal; }
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* Honour reduced-motion: freeze the aurora drift, hide the cursor
   spotlight, and stop the ticker scroll. The static aurora layers
   stay visible so the page doesn't go flat. */
@media (prefers-reduced-motion: reduce) {
  .ticker .scroll { animation: none !important; }
  .cursor-glow, .cursor-trail { display: none; }
  .aurora .blob { animation: none !important; }
}

/* ─── Smaller laptops ─────────────────────────────────────────────
   Below ~1100px the spec card sits awkwardly next to a 64px title.
   We narrow gutters and let the hero shrink. */
@media (max-width: 1100px) {
  .main { padding: 0 28px; }
  .hero { gap: 28px; }
}

/* ─── Mobile ──────────────────────────────────────────────────────
   Drop the single-viewport constraint on phones — the page can scroll
   naturally and the columns collapse to one. */
@media (max-width: 900px) {
  .landing { height: auto; overflow: visible; }
  .main { padding: 0 20px; grid-template-rows: auto auto auto; }
  .hero { grid-template-columns: 1fr; padding: 20px 0; }
  .modules { grid-template-columns: 1fr; }
  .mod { grid-template-columns: 24px 1fr; }
  .mod .open { display: none; }
  .mod p { white-space: normal; }
}
</style>
