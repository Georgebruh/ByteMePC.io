<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php } from '../../data/mock'

// Top KPI tiles. Updated from the user's saved builds in a real impl.
const stats = [
  { lbl: 'Total Builds', val: '12' },
  { lbl: 'Public',       val: '4' },
  { lbl: 'Favourites',   val: '28' },
  { lbl: 'Pinned Parts', val: '17' },
]

// Table rows — one per build. Status drives the chip variant
// (warn/ok/default) and "visibility" toggles between Public/Private.
type ChipKind = 'default' | 'ok' | 'warn' | 'purp'
interface BuildRow {
  id: string
  name: string
  detail: string
  updated: string
  status: { label: string; kind: ChipKind }
  visibility: { label: string; kind: ChipKind }
  total: number
}

const buildRows: BuildRow[] = [
  {
    id: 'apex-predator-v2',
    name: 'Apex Predator V2',
    detail: 'i9-13900K · RTX 4090 · 32GB',
    updated: '2 min ago',
    status: { label: 'PSU warning', kind: 'warn' },
    visibility: { label: 'Public', kind: 'purp' },
    total: 128300,
  },
  {
    id: 'silent-storm',
    name: 'Silent Storm',
    detail: 'Ryzen 9 7900X · RTX 4080 · 64GB',
    updated: 'Yesterday',
    status: { label: 'Complete', kind: 'ok' },
    visibility: { label: 'Public', kind: 'purp' },
    total: 146800,
  },
  {
    id: 'budget-beast-mk1',
    name: 'Budget Beast Mk1',
    detail: 'Ryzen 5 7600 · RX 7800 XT · 16GB',
    updated: '3 days ago',
    status: { label: 'Complete', kind: 'ok' },
    visibility: { label: 'Private', kind: 'default' },
    total: 58400,
  },
  {
    id: 'workstation-2026',
    name: 'Workstation 2026',
    detail: 'Threadripper · A6000 · 128GB',
    updated: '1 week ago',
    status: { label: 'Draft', kind: 'default' },
    visibility: { label: 'Private', kind: 'default' },
    total: 412900,
  },
  {
    id: 'first-build-old',
    name: 'First Build (Old)',
    detail: 'i5-12400 · RTX 3060 · 16GB',
    updated: '2 months ago',
    status: { label: 'Complete', kind: 'ok' },
    visibility: { label: 'Public', kind: 'purp' },
    total: 42100,
  },
]

// Map our chip-kind union to the global .h-tag modifiers.
function chipClass(k: ChipKind): string {
  return k === 'default' ? 'h-tag' : `h-tag ${k}`
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <div class="section-title">My Builds</div>
        <div class="section-sub">All your saved configurations.</div>
      </div>
      <RouterLink to="/builder" class="btn-primary new-build">+ New Build</RouterLink>
    </div>

    <!-- KPI tiles -->
    <div class="dash-header">
      <div v-for="s in stats" :key="s.lbl" class="dash-stat">
        <div class="lbl">{{ s.lbl }}</div>
        <div class="val">{{ s.val }}</div>
      </div>
    </div>

    <!-- Builds table -->
    <div class="builds-table">
      <div class="head">
        <span>Build Name</span>
        <span>Last Updated</span>
        <span>Status</span>
        <span>Visibility</span>
        <span>Total</span>
        <span class="right">Actions</span>
      </div>

      <div v-for="b in buildRows" :key="b.id" class="row">
        <div>
          <RouterLink :to="`/builds/${b.id}`" class="name">{{ b.name }}</RouterLink>
          <div class="detail">{{ b.detail }}</div>
        </div>
        <span class="updated">{{ b.updated }}</span>
        <span><span :class="chipClass(b.status.kind)">{{ b.status.label }}</span></span>
        <span><span :class="chipClass(b.visibility.kind)">{{ b.visibility.label }}</span></span>
        <span class="price">{{ php(b.total) }}</span>
        <div class="row-actions">
          <button class="icon-btn" title="Edit">✎</button>
          <button class="icon-btn" title="Open">↗</button>
          <button class="icon-btn" title="Duplicate">⎘</button>
          <button class="icon-btn danger" title="Delete">🗑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-build { text-decoration: none; }

.dash-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.dash-stat {
  padding: 20px;
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.dash-stat .lbl {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 8px;
}
.dash-stat .val {
  font-size: 28px;
  font-weight: 900;
  background: var(--grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
}

.builds-table {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.builds-table .head,
.builds-table .row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 160px;
  align-items: center;
  padding: 14px 20px;
  font-size: 13px;
  gap: 8px;
}
.builds-table .head {
  background: rgba(0, 212, 255, 0.05);
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-mute);
}
.head .right { text-align: right; }

.builds-table .row {
  border-bottom: 1px solid var(--line-2);
  color: #cdd;
}
.builds-table .row:last-child { border-bottom: none; }
.builds-table .row:hover { background: rgba(0, 212, 255, 0.03); }

.row .name { color: #fff; font-weight: 700; }
.row .detail {
  font-size: 11px;
  color: var(--text-mute);
  margin-top: 2px;
}
.updated { color: var(--text-mute); }

.row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .dash-header { grid-template-columns: repeat(2, 1fr); }
  .builds-table .head,
  .builds-table .row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .builds-table .head { display: none; }
  .row-actions { justify-content: flex-start; }
}
</style>
