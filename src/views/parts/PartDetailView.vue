<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { findPart, parts, php } from '../../data/mock'

const route = useRoute()

// Look up the part by URL id. If we can't find one, fall back to the
// hero part from the design preview so the screen still renders nicely.
const part = computed(() => {
  const id = String(route.params.id)
  return findPart(id) ?? {
    id, brand: 'ASUS', name: 'ROG MAXIMUS Z790 HERO',
    category: 'motherboard' as const,
    spec: 'ATX · LGA1700 · DDR5',
    price: 36290, icon: '🧩',
  }
})

// Hardcoded spec rows for the demo. Production would build these from
// the actual part record (chipset, cores, etc.).
const specs = [
  { dt: 'Socket',         dd: 'LGA1700' },
  { dt: 'Chipset',        dd: 'Intel Z790' },
  { dt: 'Form Factor',    dd: 'ATX' },
  { dt: 'RAM Type',       dd: 'DDR5' },
  { dt: 'RAM Slots',      dd: '4 (Max 192 GB)' },
  { dt: 'Max RAM Speed',  dd: '7800 MHz' },
]

const portTags = ['USB-C ×2', 'USB 3.2 ×6', 'HDMI', 'Thunderbolt 4', '2.5G LAN', 'WiFi 6E']

// "Compatible CPUs" panel pulls the cheaper two CPUs from the catalog.
const compatibleCpus = computed(() =>
  parts.filter(p => p.category === 'cpu').slice(0, 2)
)

// Crumb label switches based on the part's category.
const crumbCategory = computed(() => {
  switch (part.value.category) {
    case 'cpu': return 'CPUs'
    case 'motherboard': return 'Motherboards'
    case 'gpu': return 'GPUs'
    case 'ram': return 'RAM'
    case 'psu': return 'PSUs'
  }
})

// Mono class label for the hero panel corner.
const classTag = computed(() => {
  switch (part.value.category) {
    case 'cpu':         return 'CPU'
    case 'motherboard': return 'MB'
    case 'gpu':         return 'GPU'
    case 'ram':         return 'RAM'
    case 'psu':         return 'PSU'
  }
})
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink to="/browse">Browse</RouterLink>
      <span>/</span>
      <RouterLink to="/browse">{{ crumbCategory }}</RouterLink>
      <span>/</span>
      {{ part.name }}
    </div>

    <div class="part-detail">
      <!-- Left: hero panel (grid-paper + corner brackets) + thumbnails. -->
      <div>
        <div class="detail-hero spec-frame grid-paper">
          <span class="corner"></span>
          <span class="cls">// {{ classTag }} · {{ part.id.toUpperCase() }}</span>
          <span class="ic">{{ part.icon ?? '🧩' }}</span>
        </div>
        <div class="thumb-strip">
          <div class="thumb active">{{ part.icon ?? '🧩' }}</div>
          <div class="thumb">📷</div>
          <div class="thumb">📷</div>
          <div class="thumb">📷</div>
        </div>
      </div>

      <!-- Right: meta, price, action buttons, specs, compat panel. -->
      <div class="detail-info">
        <div class="brand">{{ part.brand }} · {{ classTag }}</div>
        <h1>{{ part.name }}</h1>

        <div class="meta-tags">
          <span class="h-tag purp">{{ part.category.toUpperCase() }}</span>
          <span class="h-tag">LGA1700</span>
          <span class="h-tag">DDR5</span>
          <span class="h-tag ok">In Stock</span>
        </div>

        <span class="price-amber">{{ php(part.price) }}</span>

        <div class="detail-actions">
          <RouterLink to="/builder/manual" class="t-btn primary">Add to Build <span class="arrow">→</span></RouterLink>
          <button class="t-btn">📌 Pin</button>
        </div>

        <span class="kicker mute section-kicker">// specifications</span>
        <dl class="spec-table">
          <div v-for="s in specs" :key="s.dt" class="spec-row">
            <dt>{{ s.dt }}</dt>
            <dd>{{ s.dd }}</dd>
          </div>
          <div class="spec-row">
            <dt>Ports</dt>
            <dd>
              <div class="ports">
                <span v-for="p in portTags" :key="p" class="h-tag">{{ p }}</span>
              </div>
            </dd>
          </div>
        </dl>

        <!-- "Compatible CPUs" — pulled from the catalog so the IDs link
             through to real detail pages. -->
        <section class="compat-section">
          <span class="kicker mute section-kicker">// compatible cpus</span>
          <div class="compat-grid">
            <RouterLink
              v-for="c in compatibleCpus"
              :key="c.id"
              :to="`/parts/${c.id}`"
              class="comp-card"
            >
              <div class="name">{{ c.name }}</div>
              <div class="spec">{{ c.spec }}</div>
              <div class="foot">
                <span class="price-amber sm">{{ php(c.price) }}</span>
                <span class="h-tag ok">Match</span>
              </div>
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.breadcrumb {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
}

.part-detail {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 32px;
}

/* ─── Left column (hero panel + thumbnails) ─── */
.detail-hero {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-mute);
  position: relative;
}
.detail-hero .cls {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  text-transform: uppercase;
}
.detail-hero .ic {
  font-size: 110px;
  line-height: 1;
}

.thumb-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 10px;
}
.thumb {
  aspect-ratio: 1;
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-mute);
  cursor: pointer;
  font-size: 20px;
}
.thumb.active { border-color: var(--cyan); }

/* ─── Right column ─── */
.detail-info h1 {
  font-family: var(--display);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 10px;
  line-height: 1.05;
  color: var(--text);
}
.brand {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--cyan);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.meta-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.price-amber {
  display: block;
  font-family: var(--display);
  font-weight: 700;
  font-size: 32px;
  letter-spacing: -0.025em;
  color: var(--amber);
  margin: 18px 0 22px;
}
.price-amber.sm {
  display: inline-block;
  margin: 0;
  font-size: 16px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.section-kicker {
  display: block;
  margin-bottom: 12px;
}

.spec-table {
  border: 1px solid var(--line);
  overflow: hidden;
}
.spec-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-top: 1px dashed var(--line);
  font-family: var(--mono);
  font-size: 12px;
}
.spec-row:first-of-type { border-top: none; }
.spec-row dt {
  background: rgba(0, 212, 255, 0.04);
  padding: 11px 16px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 10px;
}
.spec-row dd {
  padding: 11px 16px;
  color: var(--text);
}

.ports {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-section {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.compat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.comp-card {
  background: rgba(5, 8, 16, 0.7);
  border: 1px solid var(--line);
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
  text-decoration: none;
  display: block;
  font-family: var(--mono);
}
.comp-card:hover { border-color: var(--cyan); }
.comp-card .name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: -0.015em;
}
.comp-card .spec { font-size: 11px; color: var(--text-mute); line-height: 1.4; }
.comp-card .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}

@media (max-width: 1100px) {
  .part-detail { grid-template-columns: 1fr; }
}
</style>
