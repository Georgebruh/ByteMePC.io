<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php } from '../../data/mock'

// User-typed budget — kept as a string so the input handles commas
// gracefully and we don't fight number/locale formatting.
const budget = ref('120,000')

// Preset budget chips under the big input.
const presets = ['₱40k', '₱80k', '₱120k', '₱200k']

// Locks — slots where the user said "I already own this, build around
// it". The GPU one is locked in the design preview to demo the state.
interface LockSlot {
  key: string
  label: string
  icon: string
  locked: boolean
  pinnedPart?: string  // shown under the slot label when locked
}
const locks = ref<LockSlot[]>([
  { key: 'cpu',     label: 'CPU',         icon: '🖥', locked: false },
  { key: 'mobo',    label: 'Motherboard', icon: '🧩', locked: false },
  { key: 'gpu',     label: 'GPU',         icon: '🎮', locked: true, pinnedPart: 'RTX 4080' },
  { key: 'ram',     label: 'RAM',         icon: '💾', locked: false },
  { key: 'psu',     label: 'PSU',         icon: '💡', locked: false },
  { key: 'storage', label: 'Storage',     icon: '💽', locked: false },
  { key: 'case',    label: 'Case',        icon: '🗃', locked: false },
  { key: 'cooler',  label: 'Cooler',      icon: '❄', locked: false },
])

function toggleLock(key: string) {
  const slot = locks.value.find(l => l.key === key)
  if (slot) slot.locked = !slot.locked
}

// ─── Suggested build result ─────────────────────────
// Hardcoded for now — eventually this comes back from the optimiser.
const suggested = [
  { tag: 'CPU',  name: 'AMD Ryzen 9 7900X',                 sub: '12 cores · AM5 · 5.6GHz boost', price: 28900 },
  { tag: 'MOBO', name: 'ASUS ROG STRIX B650-E',             sub: 'ATX · AM5 · DDR5',              price: 16800 },
  { tag: 'GPU',  name: 'NVIDIA RTX 4080',                   sub: '16GB GDDR6X · LOCKED',          price: 68500 },
  { tag: 'RAM',  name: 'Corsair Vengeance 32GB DDR5-6000',  sub: '2 × 16GB',                      price: 9200 },
  { tag: 'PSU',  name: 'Corsair RM850x',                    sub: '850W · 80+ Gold',               price: 8400 },
  { tag: 'SSD',  name: 'Samsung 990 Pro 2TB',               sub: 'NVMe Gen4',                     price: 9800 },
  { tag: 'CASE', name: 'Lian Li Lancool 216',               sub: 'ATX Mid Tower',                 price: 5200 },
]

const summary = {
  budget: 120000,
  total: 146800,
  overBudget: 26800,
  perfScore: 9420,
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <div class="section-title">Budget Auto-Builder</div>
        <div class="section-sub">
          Drop your budget. We'll pick a fully compatible build optimized for performance.
        </div>
      </div>
      <RouterLink to="/builder" class="btn-ghost">Switch to Manual →</RouterLink>
    </div>

    <!-- ─── Top hero: pitch + budget input ─── -->
    <div class="budget-hero">
      <div>
        <h2>
          BUILD WITHIN<br>
          <span class="grad3">YOUR LIMITS.</span>
        </h2>
        <p>
          Tell us how much you want to spend. Our auto-builder picks compatible parts
          that maximize raw performance per peso — then lets you tune the result before saving.
        </p>
      </div>
      <div class="budget-input-wrap">
        <label class="field-label">Your budget</label>
        <div class="budget-amount">
          <span class="budget-currency">PHP</span>
          <input type="text" v-model="budget" />
        </div>
        <div class="budget-presets">
          <button v-for="p in presets" :key="p" type="button">{{ p }}</button>
        </div>
      </div>
    </div>

    <!-- ─── Lock-parts grid ─── -->
    <div class="lock-list">
      <h4>
        Lock parts you already own
        <span class="hint">— optional</span>
      </h4>
      <div class="lock-grid">
        <button
          v-for="s in locks"
          :key="s.key"
          class="lock-cell"
          :class="{ locked: s.locked }"
          type="button"
          @click="toggleLock(s.key)"
        >
          <span class="ic">{{ s.icon }}</span>
          {{ s.label }}<br>
          <span class="sub">{{ s.locked ? s.pinnedPart ?? 'Locked' : 'Any' }}</span>
        </button>
      </div>
    </div>

    <div class="generate-row">
      <button class="btn-primary big">⚡ Generate Build</button>
      <button class="btn-ghost">Advanced Options</button>
    </div>

    <!-- ─── Suggested build result ─── -->
    <div class="result-wrap">
      <div class="parts-list">
        <div class="result-head">Suggested Build · 99% budget utilized</div>
        <div v-for="row in suggested" :key="row.tag" class="row">
          <span class="tag">{{ row.tag }}</span>
          <div>
            <div class="part-name">{{ row.name }}</div>
            <div class="part-sub">{{ row.sub }}</div>
          </div>
          <div class="pr">{{ php(row.price) }}</div>
        </div>
      </div>

      <aside class="result-summary">
        <h4 class="caps-label">Auto Result</h4>
        <div class="row-sum"><span class="lbl">Budget</span><span class="val">{{ php(summary.budget) }}</span></div>
        <div class="row-sum"><span class="lbl">Total</span><span class="val">{{ php(summary.total) }}</span></div>
        <div class="row-sum"><span class="lbl">Over budget</span><span class="val warn">+ {{ php(summary.overBudget) }}</span></div>
        <div class="row-sum"><span class="lbl">Est. perf score</span><span class="val">{{ summary.perfScore.toLocaleString() }}</span></div>

        <div class="row-total">
          <span class="lbl">Status</span>
          <span class="h-tag warn">Over budget</span>
        </div>

        <div class="result-actions">
          <button class="btn-primary full">Tweak Build</button>
          <button class="btn-ghost full">Re-generate</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.grad3 {
  background: var(--grad-3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ─── Hero block ─── */
.budget-hero {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(168, 85, 247, 0.04));
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 36px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 36px;
  align-items: center;
}
.budget-hero h2 {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 10px;
  color: #fff;
}
.budget-hero p {
  font-size: 14px;
  color: var(--text-mute);
  line-height: 1.6;
  max-width: 480px;
}

.budget-input-wrap {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 22px;
}
.budget-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
}
.budget-currency {
  font-size: 14px;
  color: var(--cyan);
  letter-spacing: 2px;
  font-weight: 700;
}
.budget-amount input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -1px;
  font-family: inherit;
  min-width: 0;
}
.budget-presets {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.budget-presets button {
  flex: 1;
  padding: 7px 0;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid var(--line);
  color: var(--cyan);
  border-radius: 2px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

/* ─── Lock grid ─── */
.lock-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 18px;
  margin-bottom: 24px;
}
.lock-list h4 {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 12px;
}
.lock-list .hint {
  color: var(--text-low);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.lock-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.lock-cell {
  padding: 14px;
  border: 1px dashed var(--line);
  border-radius: 3px;
  text-align: center;
  color: var(--text-mute);
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  transition: all 0.2s;
}
.lock-cell:hover { color: #cdd; border-color: var(--cyan); }
.lock-cell.locked {
  border: 1px solid var(--purple);
  background: rgba(168, 85, 247, 0.08);
  color: var(--purple);
  border-style: solid;
}
.lock-cell .ic { font-size: 22px; display: block; margin-bottom: 6px; }
.lock-cell .sub { color: var(--text-low); font-size: 11px; }
.lock-cell.locked .sub { color: var(--purple); }

.generate-row { display: flex; gap: 12px; margin-bottom: 28px; }
.btn-primary.big { padding: 14px 42px; font-size: 15px; }

/* ─── Result: parts list + summary ─── */
.result-wrap {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}
.parts-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.result-head {
  padding: 18px;
  border-bottom: 1px solid var(--line);
  background: rgba(0, 212, 255, 0.05);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--cyan);
  font-weight: 800;
}
.row {
  display: grid;
  grid-template-columns: 100px 1fr 160px;
  padding: 14px 18px;
  font-size: 14px;
  border-bottom: 1px solid var(--line-2);
  align-items: center;
}
.row:last-child { border-bottom: none; }
.row .tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--cyan);
}
.row .part-name { color: #fff; font-weight: 600; }
.row .part-sub { font-size: 11px; color: var(--text-mute); margin-top: 2px; }
.row .pr {
  text-align: right;
  font-weight: 800;
  color: var(--cyan);
}

.result-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 20px;
  height: fit-content;
}
.caps-label {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 14px;
}
.row-sum {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--line-2);
}
.row-sum .lbl { color: var(--text-mute); }
.row-sum .val { color: #fff; font-weight: 600; }
.row-sum .val.warn { color: var(--red); }
.row-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 0;
  margin-top: 12px;
  border-top: 2px solid var(--cyan);
}
.row-total .lbl {
  font-size: 11px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 2px;
}
.result-actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-actions .full { width: 100%; }

@media (max-width: 1100px) {
  .budget-hero, .result-wrap { grid-template-columns: 1fr; }
  .lock-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
