<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppNav from '../components/AppNav.vue'


type SpecRow = { k: string; v: string; p: string }
const featured = {
  slug: 'midnight-foundry',
  pins: 412,
  total: '$2,507',
  rows: [
    { k: 'CPU',  v: 'Ryzen 7 9800X3D',     p: '$479' },
    { k: 'GPU',  v: 'RTX 5080 Ventus',     p: '$999' },
    { k: 'RAM',  v: 'G.Skill 32GB / 6000', p: '$118' },
    { k: 'SSD',  v: 'Crucial T705 2TB',    p: '$214' },
    { k: 'PSU',  v: 'Corsair RM850x',      p: '$139' },
  ] as SpecRow[],
}

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
    to: '/builder',
    tone: 'cyan',
  },
  {
    id: 'budget',
    num: '// 02',
    title: 'Spend the budget, not the weekend.',
    desc: 'Type a number. Get a curated, in-stock, fully compatible build.',
    cta: 'Auto-Build',
    to: '/builder/budget',
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
  <div class="landing">

    <!-- Engineer's-log status strip is opt-in via the prop; only the
         landing page asks for it. -->
    <AppNav
      :show-avatar="false"
      :status-strip="true"
      :secondary-cta="{ label: 'Sign In', to: '/sign-in' }"
      :right-cta="{ label: 'Get Bench', to: '/sign-up' }"
    />

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
            Jesse is <strong> GAY </strong>
          </p>

          <div class="actions">
            <RouterLink to="/builder" class="t-btn primary">
              <span>Start a Bench</span>
              <span class="arrow">→</span>
            </RouterLink>
            <RouterLink to="/community" class="t-btn">
              <span>Browse Builds</span>
            </RouterLink>
          </div>
        </div>

        <!-- Spec sheet card — corner-bracket frame, dashed dividers
             between part rows, total in display font at the bottom. -->
        <aside class="specsheet">
          <span class="corner"></span>
          <h4>
            Featured · /builds/{{ featured.slug }}
            <span>↑ {{ featured.pins }} pins</span>
          </h4>

          <div v-for="r in featured.rows" :key="r.k" class="spec-row">
            <span class="k">{{ r.k }}</span>
            <span class="v">{{ r.v }}</span>
            <span class="p">{{ r.p }}</span>
          </div>

          <div class="spec-foot">
            <div>
              <div class="foot-lbl">TOTAL · USD</div>
              <div class="foot-sub">5 parts · compat ✓</div>
            </div>
            <div class="total">{{ featured.total }}</div>
          </div>
        </aside>
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
               on the parent recolour both the icon and the CTA. -->
          <svg
            v-if="m.id === 'smart'"
            class="ic" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <rect x="6" y="6" width="12" height="12" rx="1" />
            <rect x="9.5" y="9.5" width="5" height="5" />
            <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
          </svg>
          <svg
            v-else-if="m.id === 'budget'"
            class="ic" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M3 12l9 4 9-4" />
            <path d="M3 17l9 4 9-4" />
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
  align-self: center;
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

/* Honour reduced-motion: stop the ticker scroll. */
@media (prefers-reduced-motion: reduce) {
  .ticker .scroll { animation: none !important; }
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
