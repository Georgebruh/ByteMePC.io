<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php } from '../../data/mock'

// ─── Slot list on the left ────────────────────────────────
// Each slot tracks its label, an icon, and a fill state — "filled"
// (✓), "empty" (—), or "warn" (!). The Motherboard slot is the active
// one in this mock so we can show the picker grid on the right.
type SlotStatus = 'filled' | 'empty' | 'warn'

interface BuilderSlot {
  key: string
  label: string
  icon: string
  status: SlotStatus
}

const slots: BuilderSlot[] = [
  { key: 'cpu',     label: 'CPU',         icon: '🖥', status: 'filled' },
  { key: 'mobo',    label: 'Motherboard', icon: '🧩', status: 'empty' },
  { key: 'gpu',     label: 'GPU',         icon: '🎮', status: 'filled' },
  { key: 'ram',     label: 'RAM ×2',      icon: '💾', status: 'filled' },
  { key: 'psu',     label: 'PSU',         icon: '💡', status: 'warn' },
  { key: 'storage', label: 'Storage',     icon: '💽', status: 'empty' },
  { key: 'case',    label: 'Case',        icon: '🗃', status: 'empty' },
  { key: 'cooler',  label: 'Cooler',      icon: '❄',  status: 'empty' },
]

// Which slot is the user currently picking parts for?
const activeSlot = ref('mobo')

// ─── Picker grid (right of the slot list) ─────────────────
// A handful of motherboard candidates, the first one marked as the
// currently-selected motherboard. The last two show how warn/error
// chips render.
const motherboardOptions = [
  { id: 1, name: 'ASUS ROG MAXIMUS Z790 HERO',   spec: 'ATX · LGA1700 · DDR5 · 4 slots · Z790', price: 36290, selected: true,  meta: 'WiFi 6E · TB4' },
  { id: 2, name: 'MSI MAG Z790 TOMAHAWK',        spec: 'ATX · LGA1700 · DDR5 · 4 slots · Z790', price: 18500, selected: false, badge: 'ok' },
  { id: 3, name: 'Gigabyte Z790 AORUS ELITE',    spec: 'ATX · LGA1700 · DDR5 · 4 slots · Z790', price: 16900, selected: false, badge: 'ok' },
  { id: 4, name: 'ASRock Z790 PG Lightning',     spec: 'ATX · LGA1700 · DDR5 · 4 slots · Z790', price: 13200, selected: false, badge: 'ok' },
  { id: 5, name: 'ASUS PRIME B660M-A',           spec: 'mATX · LGA1700 · DDR4 · 4 slots',       price: 9200,  selected: false, badge: 'warn', badgeLabel: 'RAM mismatch' },
  { id: 6, name: 'MSI PRO B660-A DDR4',          spec: 'ATX · LGA1700 · DDR4 · 4 slots',        price: 8800,  selected: false, badge: 'warn', badgeLabel: 'RAM mismatch' },
] as const

// ─── Build summary panel ──────────────────────────────────
const summary = [
  { label: 'CPU',         value: 'i9-13900K',     muted: false },
  { label: 'Motherboard', value: 'Not selected',  muted: true  },
  { label: 'GPU',         value: 'RTX 4090',      muted: false },
  { label: 'RAM',         value: '32GB DDR5 ×2',  muted: false },
  { label: 'PSU',         value: 'Underpowered',  warn: true   },
]

const compatChecks = [
  { kind: 'ok',      icon: '✓', text: 'CPU socket matches MB' },
  { kind: 'ok',      icon: '✓', text: 'RAM type DDR5 OK' },
  { kind: 'warn',    icon: '✗', text: 'PSU 750W < estimated 920W' },
  { kind: 'pending', icon: '○', text: 'Storage not yet selected' },
] as const

const subtotal = 128300
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <div class="section-title">Apex Predator V2</div>
        <div class="section-sub">
          Editing build · <span class="saved-dot">● Saved 2 min ago</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost">⚙ Build Settings</button>
        <button class="btn-primary">Save Build</button>
      </div>
    </div>

    <div class="builder">

      <!-- ─── Slot sidebar ─────────────────────────── -->
      <aside class="build-side">
        <h4>Components</h4>
        <button
          v-for="s in slots"
          :key="s.key"
          class="slot-item"
          :class="{ active: activeSlot === s.key }"
          @click="activeSlot = s.key"
        >
          <span class="slot-icon">{{ s.icon }}</span>
          <span class="slot-name">{{ s.label }}</span>
          <span class="slot-status" :class="s.status">
            {{ s.status === 'filled' ? '✓' : s.status === 'warn' ? '!' : '—' }}
          </span>
        </button>
      </aside>

      <!-- ─── Picker grid ──────────────────────────── -->
      <main class="builder-main">
        <div class="head">
          <div>
            <h2>Choose a Motherboard</h2>
            <div class="section-sub head-sub">
              638 listed · 87 compatible with your CPU (LGA1700)
            </div>
          </div>
          <button class="btn-ghost">⚙ Filter</button>
        </div>

        <div class="builder-grid">
          <div
            v-for="opt in motherboardOptions"
            :key="opt.id"
            class="comp-card"
            :class="{ selected: opt.selected }"
          >
            <div class="row-top">
              <div>
                <div class="name">{{ opt.name }}</div>
                <div class="spec">{{ opt.spec }}</div>
              </div>
              <span v-if="opt.selected" class="h-tag ok">Selected</span>
            </div>
            <div class="foot">
              <span class="price">{{ php(opt.price) }}</span>
              <span v-if="opt.selected" class="meta-extra">{{ opt.meta }}</span>
              <span v-else-if="opt.badge === 'warn'" class="h-tag warn">{{ opt.badgeLabel }}</span>
              <span v-else class="h-tag ok">Compatible</span>
            </div>
          </div>
        </div>
      </main>

      <!-- ─── Build summary (sticky) ───────────────── -->
      <aside class="build-summary">
        <h4 class="caps-label">Current Build</h4>

        <div v-for="s in summary" :key="s.label" class="summary-row">
          <span class="lbl">{{ s.label }}</span>
          <span class="val" :class="{ muted: s.muted, warn: s.warn }">{{ s.value }}</span>
        </div>

        <div class="summary-total">
          <span class="lbl">Subtotal</span>
          <span class="price big">{{ php(subtotal) }}</span>
        </div>

        <!-- Validation strip — one row per rule. -->
        <div class="caps-label" style="margin: 18px 0 8px">Compatibility</div>
        <div class="compat-list">
          <div v-for="c in compatChecks" :key="c.text" class="compat-row" :class="c.kind">
            <span class="icon">{{ c.icon }}</span>
            <span>{{ c.text }}</span>
          </div>
        </div>

        <div class="builder-actions">
          <button class="btn-primary full">Validate &amp; Save</button>
          <button class="btn-ghost full">Make Public</button>
        </div>

        <!-- Quick link to the budget auto-builder. -->
        <RouterLink to="/builder/budget" class="switch-link">
          ⚡ Try the budget auto-builder →
        </RouterLink>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.saved-dot { color: var(--green); }
.header-actions { display: flex; gap: 10px; }

.builder {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 24px;
}

/* ─── Sidebar (slot list) ─── */
.build-side {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 18px;
  height: fit-content;
}
.build-side h4 {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 12px;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 3px;
  margin-bottom: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
}
.slot-item:hover { background: rgba(0, 212, 255, 0.05); }
.slot-item.active {
  background: rgba(0, 212, 255, 0.08);
  border-color: rgba(0, 212, 255, 0.3);
}

.slot-icon { font-size: 18px; width: 24px; text-align: center; }
.slot-name { flex: 1; color: #cdd; font-weight: 600; }
.slot-status { font-size: 11px; }
.slot-status.filled { color: var(--green); }
.slot-status.empty  { color: var(--text-low); }
.slot-status.warn   { color: var(--red); }

/* ─── Picker (centre column) ─── */
.builder-main {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 24px;
}
.builder-main .head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.builder-main h2 {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #fff;
}
.head-sub { margin: 4px 0 0; }

.builder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.comp-card {
  background: rgba(5, 8, 16, 0.7);
  border: 1.5px solid var(--line);
  border-radius: 3px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.comp-card:hover { border-color: var(--cyan); }
.comp-card.selected {
  border-color: var(--cyan);
  background: rgba(0, 212, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}
.row-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.comp-card .name { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.comp-card .spec { font-size: 11px; color: var(--text-mute); line-height: 1.4; }
.comp-card .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.meta-extra { font-size: 11px; color: var(--text-mute); }

/* ─── Build summary (right column) ─── */
.build-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 80px;
}
.caps-label {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
}
.build-summary > .caps-label:first-child { margin-bottom: 14px; }

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--line-2);
}
.summary-row:last-child { border-bottom: none; }
.summary-row .lbl { color: var(--text-mute); }
.summary-row .val { color: #fff; font-weight: 600; }
.summary-row .val.muted { color: var(--text-low); }
.summary-row .val.warn  { color: var(--red); }

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0;
  margin-top: 12px;
  border-top: 2px solid var(--cyan);
}
.summary-total .lbl {
  font-size: 11px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.compat-list { margin-bottom: 4px; }
.compat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 12px;
  color: #cdd;
}
.compat-row .icon { font-size: 14px; }
.compat-row.ok      .icon { color: var(--green); }
.compat-row.warn    .icon { color: var(--red); }
.compat-row.pending .icon { color: var(--text-low); }

.builder-actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.builder-actions .full { width: 100%; }

.switch-link {
  display: block;
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--cyan);
  font-weight: 700;
  letter-spacing: 0.5px;
}

@media (max-width: 1200px) {
  .builder { grid-template-columns: 1fr; }
  .build-summary { position: static; }
}
</style>
