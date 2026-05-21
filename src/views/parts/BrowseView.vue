<script setup lang="ts">
import { computed, ref } from 'vue'
import AppNav from '../../components/AppNav.vue'
import PartCard from '../../components/PartCard.vue'
import { parts, type PartCategory } from '../../data/mock'

// The five tabs at the top of the catalog. Numbers are placeholders
// until real counts come from the DB.
const tabs: Array<{ key: PartCategory; label: string; count: number }> = [
  { key: 'cpu',         label: 'CPU',         count: 412 },
  { key: 'motherboard', label: 'Motherboard', count: 638 },
  { key: 'gpu',         label: 'GPU',         count: 287 },
  { key: 'ram',         label: 'RAM',         count: 920 },
  { key: 'psu',         label: 'PSU',         count: 343 },
]

const activeTab = ref<PartCategory>('cpu')
const search = ref('')

// Visible parts = current tab + (optional) name search.
const visibleParts = computed(() => {
  const q = search.value.trim().toLowerCase()
  return parts
    .filter(p => p.category === activeTab.value)
    .filter(p => !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
})

// Filter sidebar state — kept simple/visual for now.
const brandIntel = ref(true)
const brandAMD = ref(true)
const sockets = ref<Record<string, boolean>>({
  LGA1700: true, AM5: false, LGA1200: false, AM4: false,
})
const coresMin = ref(6)
const coresMax = ref(24)
const priceMin = ref(5000)
const priceMax = ref(45000)

function clearFilters() {
  search.value = ''
  brandIntel.value = true
  brandAMD.value = true
  sockets.value = { LGA1700: false, AM5: false, LGA1200: false, AM4: false }
}

// Live parts-price ticker — frozen for the mockup. Once the parts API
// is wired the deltas can become reactive without changing the view.
type Tick = { name: string; price: string; delta: string; dir: 'up' | 'dn' }
const ticks: Tick[] = [
  { name: '9800X3D',        price: '₱28,900', delta: '2.1%', dir: 'dn' },
  { name: 'RTX 5080',       price: '₱61,800', delta: '0.4%', dir: 'up' },
  { name: 'DDR5-6000 32GB', price: '₱7,300',  delta: '4.0%', dir: 'dn' },
  { name: 'T705 2TB',       price: '₱13,200', delta: '1.2%', dir: 'up' },
  { name: 'RM850x',         price: '₱8,400',  delta: '0.0%', dir: 'up' },
  { name: '14700K',         price: '₱21,500', delta: '0.9%', dir: 'dn' },
]
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// catalog · 3,247 components</span>
        <div class="section-title">Browse Parts</div>
        <div class="section-sub">5 categories · live market index</div>
      </div>
      <button class="t-btn">Sort: Popular</button>
    </div>

    <!-- Live parts-price ticker (mirrors the landing's ticker). -->
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

    <!-- Segmented category tabs — match the AppNav pill style. -->
    <div class="seg-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="seg"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }} · {{ t.count }}</button>
    </div>

    <div class="search-bar">
      <input class="input" v-model="search" placeholder="🔍  Search CPUs by name, brand, socket…" />
      <button class="t-btn" @click="clearFilters">Clear Filters</button>
    </div>

    <div class="catalog">
      <!-- Left filter sidebar. -->
      <aside class="filters">
        <span class="kicker mute">// filters</span>

        <div class="filter-group">
          <label class="field-label">Brand</label>
          <label class="check-row">
            <input type="checkbox" v-model="brandIntel" /> Intel
            <span class="count">218</span>
          </label>
          <label class="check-row">
            <input type="checkbox" v-model="brandAMD" /> AMD
            <span class="count">194</span>
          </label>
        </div>

        <div class="filter-group">
          <label class="field-label">Socket</label>
          <label v-for="(_, sock) in sockets" :key="sock" class="check-row">
            <input type="checkbox" v-model="sockets[sock]" /> {{ sock }}
          </label>
        </div>

        <div class="filter-group">
          <label class="field-label">Cores</label>
          <div class="range">
            <input v-model.number="coresMin" placeholder="Min" />
            <input v-model.number="coresMax" placeholder="Max" />
          </div>
        </div>

        <div class="filter-group">
          <label class="field-label">Price (PHP)</label>
          <div class="range">
            <input v-model.number="priceMin" placeholder="₱ Min" />
            <input v-model.number="priceMax" placeholder="₱ Max" />
          </div>
        </div>

        <button class="t-btn primary full">Apply Filters</button>
      </aside>

      <!-- Right grid of part cards. -->
      <div class="parts-grid">
        <PartCard v-for="p in visibleParts" :key="p.id" :part="p" />
        <div v-if="!visibleParts.length" class="empty-state">
          <div class="ic" style="font-size:40px;margin-bottom:12px">🔍</div>
          No matching parts. Try clearing the search.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.page-header .kicker { display: block; margin-bottom: 6px; }
.section-title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 4px;
}
.section-sub {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-low);
}

/* ─── Live ticker ─── */
.ticker {
  padding: 8px 16px;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin: 18px 0 22px;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
}
.ticker .scroll {
  display: inline-flex;
  gap: 40px;
  white-space: nowrap;
  animation: t-scroll 45s linear infinite;
}
.ticker .tick { display: inline-flex; align-items: baseline; gap: 8px; }
.ticker b         { color: var(--cyan); font-weight: 500; }
.ticker .delta-up { color: var(--green); font-style: normal; }
.ticker .delta-dn { color: var(--red);   font-style: normal; }
@keyframes t-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker .scroll { animation: none !important; }
}

/* ─── Segmented tabs ─── */
.seg-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  margin-bottom: 18px;
  overflow-x: auto;
  width: fit-content;
}
.seg {
  padding: 8px 16px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-mute);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}
.seg:hover:not(.active) { color: var(--text); }
.seg.active {
  background: var(--text);
  color: var(--bg);
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}
.search-bar .input { flex: 1; }

.catalog {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 22px;
}

.filters {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 18px;
  height: fit-content;
}
.filters .kicker { display: block; margin-bottom: 14px; }
.filter-group {
  padding: 14px 0;
  border-top: 1px dashed var(--line);
}
.filter-group:first-of-type { border-top: none; padding-top: 0; }

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
}
.check-row input { accent-color: var(--cyan); }
.check-row .count {
  margin-left: auto;
  color: var(--text-low);
  font-size: 10px;
  letter-spacing: 0.1em;
}

.range { display: flex; gap: 8px; }
.range input {
  flex: 1;
  padding: 8px;
  font-family: var(--mono);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 0;
}

.t-btn.full { margin-top: 8px; }

.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 1100px) {
  .catalog { grid-template-columns: 1fr; }
  .parts-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
}
</style>
