<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { findBuild, builds, php } from '../../data/mock'

const route = useRoute()

// Look up the build by its URL id, falling back to the hero build
// (Apex Predator V2) so unknown ids still produce something useful.
const build = computed(() => {
  const id = String(route.params.id)
  return findBuild(id) ?? builds[0]
})

// User initials for the hex-tile author chip.
const authorInitials = computed(() => {
  const handle = build.value.user.replace(/^@/, '')
  return handle.slice(0, 2).toUpperCase()
})

// Mono build slug shown in the hero panel corner.
const buildSlug = computed(() => build.value.id.toUpperCase())

// Pre-baked validation rows — these match the design preview. A real
// impl would build them from compatibility checks on the parts list.
const validations = [
  { ok: true, text: 'CPU socket (LGA1700) matches motherboard' },
  { ok: true, text: 'RAM type DDR5 matches motherboard' },
  { ok: true, text: 'RAM slot count (2) ≤ MB slots (4)' },
  { ok: true, text: 'PSU 1000W ≥ estimated 920W (12% headroom)' },
]
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink to="/community">Community</RouterLink>
      <span>/</span>
      <RouterLink to="/community">Public Builds</RouterLink>
      <span>/</span>
      {{ build.name }}
    </div>

    <!-- ─── Hero strip: spec-sheet panel + meta ─── -->
    <div class="build-hero spec-frame grid-paper">
      <span class="corner"></span>
      <div class="hero-left">
        <span class="kicker">// build · {{ buildSlug }}</span>
        <h1>{{ build.name }}</h1>
        <div class="hero-meta">
          ↑ 412 PINS · {{ build.views.toLocaleString() }} VIEWS · UPDATED 2 MIN AGO
        </div>
        <div class="hero-tags">
          <span class="h-tag purp">High-End</span>
          <span class="h-tag">4K Gaming</span>
          <span class="h-tag ok">Verified Compat</span>
        </div>
        <div class="author-row">
          <span class="hex-tile ini">{{ authorInitials }}</span>
          <span class="uname">{{ build.user }}</span>
        </div>
        <p class="build-desc">{{ build.desc }}</p>
        <div class="hero-actions">
          <button class="t-btn primary">⎘ Duplicate</button>
          <button class="t-btn">♡ Favourite</button>
          <button class="t-btn">↗ Share</button>
        </div>
      </div>
      <div class="hero-right">
        <div class="price-lbl">TOTAL · PHP</div>
        <div class="price-val">{{ php(build.totalPrice) }}</div>
        <div class="price-sub">{{ build.parts.length }} parts · compat ✓</div>
      </div>
    </div>

    <!-- ─── Parts list ─── -->
    <span class="kicker mute section-kicker">// parts list</span>
    <div class="parts-list">
      <div v-for="row in build.parts" :key="row.tag" class="row">
        <span class="tag">{{ row.tag }}</span>
        <div>
          <div class="part-name">{{ row.name }}</div>
          <div class="part-sub">{{ row.sub }}</div>
        </div>
        <div class="pr">{{ php(row.price) }}</div>
      </div>
      <!-- Bottom row is the total — amber underscore. -->
      <div class="row total">
        <span class="tag total-tag">// TOTAL · PHP</span>
        <div></div>
        <div class="pr big">{{ php(build.totalPrice) }}</div>
      </div>
    </div>

    <!-- ─── Validation block ─── -->
    <section class="validation-section">
      <span class="kicker mute section-kicker">// validation report</span>
      <div class="compat-list">
        <div v-for="v in validations" :key="v.text" class="compat-row">
          <span class="icon">[OK]</span>
          <span>{{ v.text }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.breadcrumb {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
}

/* ─── Hero — grid-paper spec-frame ─── */
.build-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
  padding: 28px 32px;
  margin-bottom: 32px;
}
.build-hero .kicker { display: block; margin-bottom: 10px; }

.hero-left h1 {
  font-family: var(--display);
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 10px;
  color: var(--text);
}
.hero-meta {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: var(--text-low);
  text-transform: uppercase;
  margin-bottom: 14px;
}
.hero-tags { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.author-row .ini {
  width: 26px;
  height: 26px;
  font-size: 10px;
}
.author-row .uname {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--cyan);
  font-weight: 500;
  letter-spacing: 0.06em;
}

.build-desc {
  color: var(--text-dim);
  line-height: 1.65;
  margin-bottom: 20px;
  font-family: var(--mono);
  font-size: 12px;
}

.hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.hero-right {
  text-align: right;
  border-left: 1px dashed var(--line);
  padding-left: 28px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hero-right .price-lbl {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-low);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.hero-right .price-val {
  font-family: var(--display);
  font-size: 34px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.025em;
  line-height: 1;
}
.hero-right .price-sub {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--text-low);
  text-transform: uppercase;
  margin-top: 8px;
}

.section-kicker { display: block; margin-bottom: 12px; }

/* ─── Parts list ─── */
.parts-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 110px 1fr 160px;
  padding: 13px 18px;
  font-family: var(--mono);
  font-size: 12px;
  border-bottom: 1px dashed var(--line);
  align-items: center;
}
.row:last-child { border-bottom: none; }
.row .tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
}
.row .part-name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
}
.row .part-sub { font-size: 10.5px; color: var(--text-mute); margin-top: 3px; letter-spacing: 0.04em; }
.row .pr {
  text-align: right;
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 14px;
  letter-spacing: -0.015em;
}

.row.total {
  background: rgba(0, 212, 255, 0.04);
  border-top: 1px solid var(--cyan);
  border-bottom: none;
}
.row.total .total-tag { color: var(--cyan); }
.row .pr.big {
  font-size: 22px;
  letter-spacing: -0.02em;
}

/* ─── Validation strip ─── */
.validation-section {
  margin-top: 32px;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.compat-list { margin-bottom: 4px; }
.compat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
}
.compat-row .icon {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--green);
  font-weight: 700;
}

@media (max-width: 1100px) {
  .build-hero { grid-template-columns: 1fr; gap: 18px; }
  .hero-right {
    border-left: none;
    border-top: 1px dashed var(--line);
    padding-left: 0;
    padding-top: 18px;
    text-align: left;
  }
  .hero-left h1 { font-size: 30px; }
}
</style>
