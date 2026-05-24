<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php } from '../../data/mock'

// ─── Slot list on the left ────────────────────────────────
// Each slot tracks its label, a short mono code (hex-tile content),
// and a fill state — "filled" (ok), "empty" (—), or "warn" (!).
type SlotStatus = 'filled' | 'empty' | 'warn'

interface BuilderSlot {
  key: string
  label: string
  code: string
  picked: string
  status: SlotStatus
}

const slots: BuilderSlot[] = [
  { key: 'cpu',     label: 'CPU',         code: 'CPU', picked: 'i9-13900K',    status: 'filled' },
  { key: 'mobo',    label: 'Motherboard', code: 'MB',  picked: '— pick one',   status: 'empty'  },
  { key: 'gpu',     label: 'GPU',         code: 'GPU', picked: 'RTX 4090',     status: 'filled' },
  { key: 'ram',     label: 'RAM ×2',      code: 'RAM', picked: '32GB DDR5',    status: 'filled' },
  { key: 'psu',     label: 'PSU',         code: 'PSU', picked: '750W (low)',   status: 'warn'   },
  { key: 'storage', label: 'Storage',     code: 'SSD', picked: '— pick one',   status: 'empty'  },
  { key: 'case',    label: 'Case',        code: 'CSE', picked: '— pick one',   status: 'empty'  },
  { key: 'cooler',  label: 'Cooler',      code: 'COO', picked: '— pick one',   status: 'empty'  },
]

// Which slot is the user currently picking parts for?
const activeSlot = ref('mobo')

// ─── Picker grid (right of the slot list) ─────────────────
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
  { label: 'CPU',  value: 'i9-13900K',     price: '₱32,500', muted: false },
  { label: 'MB',   value: '— Not set',     price: '—',       muted: true  },
  { label: 'GPU',  value: 'RTX 4090',      price: '₱94,500', muted: false },
  { label: 'RAM',  value: '32GB DDR5 ×2',  price: '₱9,200',  muted: false },
  { label: 'PSU',  value: 'Underpowered',  price: '₱8,400',  warn: true   },
]

const compatChecks = [
  { kind: 'ok',      bracket: '[OK]', text: 'CPU socket matches MB' },
  { kind: 'ok',      bracket: '[OK]', text: 'RAM type DDR5 OK' },
  { kind: 'warn',    bracket: '[!!]', text: 'PSU 750W < estimated 920W' },
  { kind: 'pending', bracket: '[??]', text: 'Storage not yet selected' },
] as const

const subtotal = 128300
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// builder · editing</span>
        <div class="section-title">Apex Predator V2</div>
        <div class="section-sub">
          <span class="saved-dot">●</span> SAVED 2 MIN AGO
        </div>
      </div>
      <div class="header-actions">
        <button class="t-btn">Build Settings</button>
        <button class="t-btn primary">Save Build</button>
      </div>
    </div>

    <div class="builder">

      <!-- ─── Slot terminal log (left) ─── -->
      <aside class="build-side">
        <span class="kicker mute side-kicker">// components</span>
        <button
          v-for="(s, i) in slots"
          :key="s.key"
          class="slot-log"
          :class="{ active: activeSlot === s.key }"
          @click="activeSlot = s.key"
        >
          <span class="hex-tile code">{{ s.code }}</span>
          <div class="nm">
            {{ s.label }}
            <small>{{ s.picked }}</small>
          </div>
          <span class="st" :class="s.status">
            {{ s.status === 'filled' ? '[OK]' : s.status === 'warn' ? '[!!]' : '[--]' }}
          </span>
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
        </button>
      </aside>

      <!-- ─── Picker grid (centre) ─── -->
      <main class="builder-main">
        <div class="head">
          <div>
            <span class="kicker mute">// pick · motherboard</span>
            <h2>Choose a Motherboard</h2>
            <div class="section-sub head-sub">638 LISTED · 87 COMPATIBLE WITH LGA1700</div>
          </div>
          <button class="t-btn">Filter</button>
        </div>

        <div class="builder-grid">
          <div
            v-for="opt in motherboardOptions"
            :key="opt.id"
            class="comp-card"
            :class="{ selected: opt.selected }"
          >
            <span v-if="opt.selected" class="select-kicker">// SELECTED</span>
            <div class="name">{{ opt.name }}</div>
            <div class="spec">{{ opt.spec }}</div>
            <div class="foot">
              <span class="price-amber">{{ php(opt.price) }}</span>
              <span v-if="opt.selected" class="meta-extra">{{ opt.meta }}</span>
              <span v-else-if="opt.badge === 'warn'" class="h-tag warn">{{ opt.badgeLabel }}</span>
              <span v-else class="h-tag ok">Compatible</span>
            </div>
          </div>
        </div>
      </main>

      <!-- ─── Build summary (right) ─── -->
      <aside class="build-summary">
        <span class="kicker mute side-kicker">// current build</span>

        <div v-for="s in summary" :key="s.label" class="summary-row">
          <span class="k">{{ s.label }}</span>
          <span class="v" :class="{ muted: s.muted, warn: s.warn }">{{ s.value }}</span>
          <span class="p" :class="{ muted: s.muted, warn: s.warn }">{{ s.price }}</span>
        </div>

        <div class="summary-total">
          <span class="lbl">SUBTOTAL · PHP</span>
          <span class="total-val">{{ php(subtotal) }}</span>
        </div>

        <!-- Validation strip — one row per rule. -->
        <span class="kicker mute side-kicker compat-kicker">// compatibility</span>
        <div class="compat-list">
          <div v-for="c in compatChecks" :key="c.text" class="compat-row" :class="c.kind">
            <span class="bracket">{{ c.bracket }}</span>
            <span>{{ c.text }}</span>
          </div>
        </div>

        <div class="builder-actions">
          <button class="t-btn primary full">Validate &amp; Save</button>
          <button class="t-btn full">Make Public</button>
        </div>

        <!-- Quick link to the budget auto-builder. -->
        <RouterLink to="/builder/auto" class="switch-link">
          ⚡ Try the budget auto-builder →
        </RouterLink>
      </aside>
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
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
}
.saved-dot {
  color: var(--green);
  font-size: 8px;
  vertical-align: middle;
  margin-right: 4px;
}

.header-actions { display: flex; gap: 10px; }

.builder {
  display: grid;
  grid-template-columns: 290px 1fr 320px;
  gap: 22px;
}

/* ─── Slot terminal log ─── */
.build-side {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 16px;
  height: fit-content;
}
.side-kicker { display: block; margin-bottom: 12px; }

.slot-log {
  display: grid;
  grid-template-columns: 32px 1fr auto 26px;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-bottom: 1px dashed var(--line);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  font-family: var(--mono);
  transition: background 0.15s;
}
.slot-log:last-child { border-bottom: none; }
.slot-log:hover { background: rgba(0, 212, 255, 0.04); }
.slot-log.active {
  background: rgba(0, 212, 255, 0.06);
  border-left: 2px solid var(--cyan);
  padding-left: 8px;
}

.slot-log .code {
  width: 30px;
  height: 22px;
  font-size: 9px;
  letter-spacing: 0.12em;
}
.slot-log .nm {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0.04em;
}
.slot-log .nm small {
  display: block;
  font-size: 9.5px;
  color: var(--text-low);
  font-weight: 400;
  margin-top: 2px;
  letter-spacing: 0.06em;
}
.slot-log .st {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-align: right;
  font-weight: 700;
}
.slot-log .st.filled { color: var(--green); }
.slot-log .st.warn   { color: var(--red); }
.slot-log .st.empty  { color: var(--text-low); }
.slot-log .idx {
  font-size: 9.5px;
  color: var(--text-low);
  letter-spacing: 0.16em;
  text-align: right;
}

/* ─── Picker (centre column) ─── */
.builder-main {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 22px;
}
.builder-main .head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}
.builder-main h2 {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-top: 4px;
}
.head-sub { margin: 4px 0 0; }

.builder-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.comp-card {
  position: relative;
  background: rgba(5, 8, 16, 0.7);
  border: 1px solid var(--line);
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: var(--mono);
}
.comp-card:hover { border-color: var(--cyan); }
.comp-card.selected {
  border-color: var(--cyan);
  border-left-width: 2px;
  background: rgba(0, 212, 255, 0.04);
}
.comp-card .select-kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--cyan);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.comp-card .name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
  margin-bottom: 6px;
}
.comp-card .spec {
  font-size: 11px;
  color: var(--text-mute);
  line-height: 1.5;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}
.comp-card .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.price-amber {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 15px;
  letter-spacing: -0.015em;
}
.meta-extra { font-size: 10.5px; color: var(--text-mute); letter-spacing: 0.06em; }

/* ─── Build summary (right column) ─── */
.build-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 18px;
  height: fit-content;
  position: sticky;
  top: 80px;
}

.summary-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: baseline;
  padding: 7px 0;
  border-top: 1px dashed var(--line);
  font-size: 11.5px;
}
.summary-row:first-of-type { border-top: none; padding-top: 0; }
.summary-row .k {
  color: var(--text-low);
  letter-spacing: 0.06em;
  font-weight: 500;
}
.summary-row .v { color: var(--text); letter-spacing: 0.02em; }
.summary-row .v.muted { color: var(--text-low); }
.summary-row .v.warn  { color: var(--red); }
.summary-row .p {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 12px;
  letter-spacing: -0.015em;
}
.summary-row .p.muted { color: var(--text-low); }
.summary-row .p.warn  { color: var(--red); }

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 0 0;
  margin-top: 10px;
  border-top: 1px solid var(--cyan);
}
.summary-total .lbl {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-mute);
  letter-spacing: 0.18em;
}
.summary-total .total-val {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: -0.025em;
}

.compat-kicker { margin-top: 18px; margin-bottom: 8px; }
.compat-list {}
.compat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 11px;
  color: var(--text-dim);
}
.compat-row .bracket {
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 10px;
  flex-shrink: 0;
}
.compat-row.ok      .bracket { color: var(--green); }
.compat-row.warn    .bracket { color: var(--red); }
.compat-row.pending .bracket { color: var(--text-low); }

.builder-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.switch-link {
  display: block;
  margin-top: 14px;
  text-align: center;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--cyan);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .builder { grid-template-columns: 1fr; }
  .build-summary { position: static; }
}
</style>
