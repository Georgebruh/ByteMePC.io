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
      <!-- Left: hero "image" + thumbnail strip. -->
      <div>
        <div class="detail-hero">{{ part.icon ?? '🧩' }}</div>
        <div class="thumb-strip">
          <div class="thumb active">{{ part.icon ?? '🧩' }}</div>
          <div class="thumb">📷</div>
          <div class="thumb">📷</div>
          <div class="thumb">📷</div>
        </div>
      </div>

      <!-- Right: meta, price, action buttons, specs, compat panel. -->
      <div class="detail-info">
        <div class="brand">{{ part.brand }}</div>
        <h1>{{ part.name }}</h1>

        <div class="meta-tags">
          <span class="h-tag purp">{{ part.category.toUpperCase() }}</span>
          <span class="h-tag">LGA1700</span>
          <span class="h-tag">DDR5</span>
          <span class="h-tag ok">In Stock</span>
        </div>

        <span class="price big">{{ php(part.price) }}</span>

        <div class="detail-actions">
          <RouterLink to="/builder" class="btn-primary">Add to Build</RouterLink>
          <button class="btn-ghost">📌 Pin</button>
          <button class="btn-ghost">♡ Save</button>
        </div>

        <h3 class="caps-label">Specifications</h3>
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
          <h3 class="caps-label">Compatible CPUs</h3>
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
                <span class="price">{{ php(c.price) }}</span>
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
.part-detail {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 32px;
}

/* ─── Left column (hero image + thumbnails) ─── */
.detail-hero {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(168, 85, 247, 0.06));
  border: 1px solid var(--line);
  border-radius: 4px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  color: var(--text-mute);
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
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-mute);
  cursor: pointer;
}
.thumb.active { border-color: var(--cyan); }

/* ─── Right column ─── */
.detail-info h1 {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 8px;
  line-height: 1.1;
  color: #fff;
}
.brand {
  font-size: 13px;
  color: var(--cyan);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 16px;
}
.meta-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.price.big {
  margin: 18px 0 22px;
  display: block;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
}
.detail-actions .btn-primary {
  text-decoration: none;
  display: inline-block;
}

/* Section heading helper — short caps label. */
.caps-label {
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 12px;
  font-weight: 700;
}

/* Spec table is a series of two-column rows with a tinted left cell. */
.spec-table {
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.spec-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-bottom: 1px solid var(--line-2);
  font-size: 13px;
}
.spec-row:last-child { border-bottom: none; }
.spec-row dt {
  background: rgba(0, 212, 255, 0.04);
  padding: 11px 16px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
}
.spec-row dd {
  padding: 11px 16px;
  color: #fff;
}

.ports {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-section {
  margin-top: 36px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
}
.compat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.comp-card {
  background: rgba(5, 8, 16, 0.7);
  border: 1.5px solid var(--line);
  border-radius: 3px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: block;
}
.comp-card:hover { border-color: var(--cyan); }
.comp-card .name { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.comp-card .spec { font-size: 11px; color: var(--text-mute); line-height: 1.4; }
.comp-card .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

@media (max-width: 1100px) {
  .part-detail { grid-template-columns: 1fr; }
}
</style>
