<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php } from '../../data/mock'

// Top KPI tiles. Updated from the user's saved builds in a real impl.
const stats = [
  { lbl: 'Total Builds', val: '12', delta: '+2 THIS WEEK', deltaPos: true },
  { lbl: 'Public',       val: '4',  delta: 'NO CHANGE',    deltaPos: false },
  { lbl: 'Favourites',   val: '28', delta: '+5',           deltaPos: true },
  { lbl: 'Pinned Parts', val: '17', delta: 'NO CHANGE',    deltaPos: false },
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

  <!-- Per-page ops strip — same vocabulary as the landing. -->
  <div class="terminal-strip page-strip" aria-hidden="true">
    <span class="dot"></span>
    <span class="lbl">DASHBOARD · MY BUILDS</span>
    <span class="sep">/</span>
    <span class="lbl">12 BUILDS</span>
    <span class="sep">/</span>
    <span class="lbl">4 PUBLIC</span>
    <span class="sep">/</span>
    <span class="lbl">28 FAVOURITED</span>
    <span class="grow"></span>
    <span class="lbl">LAST EDIT 2 MIN</span>
  </div>

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// dashboard</span>
        <div class="section-title">My Builds</div>
        <div class="section-sub">All your saved configurations.</div>
      </div>
      <RouterLink to="/builder" class="t-btn primary new-build">+ New Build</RouterLink>
    </div>

    <!-- KPI tiles — directory grid with amber display numerals. -->
    <div class="kpi-grid">
      <div v-for="s in stats" :key="s.lbl" class="kpi-cell">
        <div class="lbl">{{ s.lbl }}</div>
        <div class="val">{{ s.val }}</div>
        <div class="delta" :class="{ pos: s.deltaPos }">{{ s.delta }}</div>
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
        <span class="total-amber">{{ php(b.total) }}</span>
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
.page { font-family: var(--mono); }

/* Page-level status strip — sits flush against the bottom of the nav. */
.page-strip {
  padding-left: 60px;
  padding-right: 60px;
  border-top: none;
  border-left: none;
  border-right: none;
  background: rgba(5, 8, 16, 0.4);
}

.new-build { text-decoration: none; }

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

/* ─── KPI directory grid ─── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  margin-bottom: 28px;
}
.kpi-cell {
  background: var(--bg);
  padding: 18px 20px;
}
.kpi-cell .lbl {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-low);
  margin-bottom: 8px;
}
.kpi-cell .val {
  font-family: var(--display);
  font-weight: 700;
  font-size: 32px;
  color: var(--amber);
  letter-spacing: -0.025em;
  line-height: 1;
}
.kpi-cell .delta {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  margin-top: 6px;
  letter-spacing: 0.12em;
}
.kpi-cell .delta.pos { color: var(--green); }

/* ─── Builds table ─── */
.builds-table {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
  font-family: var(--mono);
}
.builds-table .head,
.builds-table .row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 160px;
  align-items: center;
  padding: 14px 20px;
  font-size: 12px;
  gap: 8px;
}
.builds-table .head {
  background: rgba(0, 212, 255, 0.04);
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-mute);
}
.head .right { text-align: right; }

.builds-table .row {
  border-bottom: 1px dashed var(--line);
  color: var(--text-dim);
}
.builds-table .row:last-child { border-bottom: none; }
.builds-table .row:hover { background: rgba(0, 212, 255, 0.03); }

.row .name {
  font-family: var(--display);
  font-weight: 600;
  font-size: 14.5px;
  color: var(--text);
  letter-spacing: -0.015em;
}
.row .detail {
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 3px;
  letter-spacing: 0.04em;
}
.updated { color: var(--text-mute); letter-spacing: 0.04em; }

.total-amber {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 14px;
  letter-spacing: -0.015em;
}

.row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .page-strip { padding-left: 20px; padding-right: 20px; overflow-x: auto; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .builds-table .head,
  .builds-table .row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .builds-table .head { display: none; }
  .row-actions { justify-content: flex-start; }
}
</style>
