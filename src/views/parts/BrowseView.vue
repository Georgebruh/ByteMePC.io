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
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <div class="section-title">Browse Parts</div>
        <div class="section-sub">3,247 components across 5 categories.</div>
      </div>
      <button class="btn-ghost">⚙ Sort: Most Popular</button>
    </div>

    <!-- Category tabs — switching swaps the visible grid. -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }} · {{ t.count }}</button>
    </div>

    <div class="search-bar">
      <input class="input" v-model="search" placeholder="🔍  Search CPUs by name, brand, socket…" />
      <button class="btn-ghost" @click="clearFilters">Clear filters</button>
    </div>

    <div class="catalog">
      <!-- Left filter sidebar. Sticky on tall pages. -->
      <aside class="filters">
        <h4>Filters</h4>

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

        <button class="btn-primary full">Apply Filters</button>
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
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.search-bar .input { flex: 1; }

.catalog {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
}

.filters {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
}
.filters h4 {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 14px;
}
.filter-group { margin-bottom: 22px; }

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
  color: #ccd;
  cursor: pointer;
}
.check-row input { accent-color: var(--cyan); }
.check-row .count {
  margin-left: auto;
  color: var(--text-low);
  font-size: 11px;
}

.range { display: flex; gap: 8px; }
.range input {
  flex: 1;
  padding: 8px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--line);
  color: #fff;
  border-radius: 2px;
  font-family: inherit;
}

.btn-primary.full { width: 100%; }

.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .catalog { grid-template-columns: 1fr; }
  .parts-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .parts-grid { grid-template-columns: 1fr; }
}
</style>
