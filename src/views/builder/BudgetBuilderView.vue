<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php, type BuildPartRef } from '../../data/mock'

// AI stuff grrrr
import { supabase } from '../../lib/supabase' 
import { fetchAllParts } from '../../data/catalog'
import { createBuild } from '../../data/builds'
import type { CreateBuildInput } from '../../data/builds'

// User-typed budget — kept as a string so the input handles commas
// gracefully and we don't fight number/locale formatting.
const budget = ref('120,000')

// Preset budget chips under the big input.
const presets = ['₱40k', '₱80k', '₱120k', '₱200k']
const activePreset = ref('₱120k')

interface SuggestedPart extends BuildPartRef {
  id: string;
}

const suggested = ref<SuggestedPart[]>([])
const summary = ref({
  budget: 0,
  total: 0,
  overBudget: 0,
  perfScore: 0,
})

// for some UI loading stuff I guess
const isGenerating = ref(false)
const isSaving = ref(false)

// Locks — slots where the user said "I already own this, build around
// it". The GPU one is locked in the design preview to demo the state.
interface LockSlot {
  key: string
  label: string
  code: string
  locked: boolean
  pinnedPart?: string  // shown under the slot label when locked
}
const locks = ref<LockSlot[]>([
  { key: 'cpu',     label: 'CPU',         code: 'CPU', locked: false },
  { key: 'mobo',    label: 'Motherboard', code: 'MB',  locked: false },
  { key: 'gpu',     label: 'GPU',         code: 'GPU', locked: true, pinnedPart: 'RTX 4080' },
  { key: 'ram',     label: 'RAM',         code: 'RAM', locked: false },
  { key: 'psu',     label: 'PSU',         code: 'PSU', locked: false },
  { key: 'storage', label: 'Storage',     code: 'SSD', locked: false },
  { key: 'case',    label: 'Case',        code: 'CSE', locked: false },
  { key: 'cooler',  label: 'Cooler',      code: 'COO', locked: false },
])

function toggleLock(key: string) {
  const slot = locks.value.find(l => l.key === key)
  if (slot) slot.locked = !slot.locked
}

async function generatePCBuild() {
  isGenerating.value = true;
  const numericBudget = Number(budget.value.replace(/,/g, ''));
  const lockedParts = locks.value.filter(l => l.locked);

  try {
    // 1. Fetch the formatted catalog from your existing logic
    const allParts = await fetchAllParts();

    // 2. Token Optimization: Filter out parts that cost more than 80% of the total budget
    // (You wouldn't spend 100k on a GPU if your total budget is 120k)
    const sensibleParts = allParts.filter(part => part.price <= numericBudget * 0.8);

    // 3. Send the budget, locks, and the optimized catalog to your Edge Function
    const response = await fetch('YOUR_EDGE_FUNCTION_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        budget: numericBudget, 
        lockedParts,
        catalog: sensibleParts // Send the pre-formatted parts array to Gemini
      })
    });

    if (!response.ok) throw new Error('Failed to generate build');

    const data = await response.json();
    
    // 4. Update the UI
    suggested.value = data.suggested;
    summary.value = data.summary;

  } catch (error) {
    console.error("Generation failed:", error);
  } finally {
    isGenerating.value = false;
  }
}

async function saveGeneratedBuild() {
  if (!suggested.value.length) return;
  isSaving.value = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to save.");

    const getId = (tag: string) => {
      const part = suggested.value.find(p => p.tag === tag);
      return part ? { id: part.id } : null; // id will be formatted like "cpu-123"
    };

    const buildPayload: CreateBuildInput = {
      userId: user.id,
      name: `Auto-Build (${summary.value.perfScore})`,
      isPublic: false,
      cpu: getId('CPU'),
      motherboard: getId('MOBO'),
      gpu: getId('GPU'),
      ram: getId('RAM'),
      psu: getId('PSU'),
      case: getId('CASE'),
      cooler: getId('COOLER'),
    };

    const newBuildId = await createBuild(buildPayload);
    console.log("Saved! Build ID:", newBuildId);

  } catch (error) {
    console.error("Failed to save:", error);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="page-header">
      <div>
        <span class="kicker">// auto · optimiser</span>
        <div class="section-title">Budget Auto-Builder</div>
        <div class="section-sub">Drop a budget · we pick the parts</div>
      </div>
      <RouterLink to="/builder/manual" class="t-btn">Switch to Manual <span class="arrow">→</span></RouterLink>
    </div>

    <!-- ─── Command-prompt budget panel ─── -->
    <div class="budget-prompt">
      <div class="prompt-ln"><span class="arrow">$</span> bytemepc auto-build --budget</div>
      <div class="prompt-ln cmt"># optimises raw performance per peso · locks parts you own</div>

      <div class="input-line">
        <span class="cur">PHP</span>
        <input type="text" v-model="budget" />
        <span class="caret"></span>
      </div>

      <div class="presets">
        <button
          v-for="p in presets"
          :key="p"
          type="button"
          class="t-btn"
          :class="{ primary: activePreset === p }"
          @click="activePreset = p"
        >{{ p }}</button>
      </div>
    </div>

    <!-- ─── Lock-parts directory grid ─── -->
    <div class="lock-section">
      <span class="kicker mute">// lock owned parts <span class="hint">— optional</span></span>
      <div class="lock-grid">
        <button
          v-for="s in locks"
          :key="s.key"
          class="lock-cell"
          :class="{ locked: s.locked }"
          type="button"
          @click="toggleLock(s.key)"
        >
          <span class="hex-tile code">{{ s.code }}</span>
          <span class="lbl">{{ s.label }}</span>
          <span class="sub">{{ s.locked ? s.pinnedPart ?? 'locked' : 'any' }}</span>
        </button>
      </div>
    </div>

    <div class="generate-row">
      <button class="t-btn primary big">⚡ Generate Build</button>
      <button class="t-btn">Advanced Options</button>
    </div>

    <!-- ─── Suggested build result ─── -->
    <div class="result-wrap">
      <div class="parts-list">
        <div class="result-head">// suggested build · 99% budget utilized</div>
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
        <span class="kicker mute side-kicker">// auto result</span>
        <div class="row-sum"><span class="lbl">Budget</span><span class="val">{{ php(summary.budget) }}</span></div>
        <div class="row-sum"><span class="lbl">Total</span><span class="val">{{ php(summary.total) }}</span></div>
        <div class="row-sum"><span class="lbl">Over budget</span><span class="val warn">+ {{ php(summary.overBudget) }}</span></div>
        <div class="row-sum"><span class="lbl">Est. perf</span><span class="val">{{ summary.perfScore.toLocaleString() }}</span></div>

        <div class="row-total">
          <span class="lbl">STATUS</span>
          <span class="h-tag warn">Over budget</span>
        </div>

        <div class="result-actions">
          <button 
            class="t-btn primary full" 
            @click="saveGeneratedBuild" 
            :disabled="isSaving || suggested.length === 0"
          >
            {{ isSaving ? 'Saving...' : 'Save Build to Profile' }}
          </button>
          <button class="t-btn full" @click="generatePCBuild">Re-generate</button>
        </div>
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

/* ─── Command-prompt budget panel ─── */
.budget-prompt {
  border: 1px solid var(--line);
  background: var(--bg);
  padding: 22px 26px;
  margin-bottom: 22px;
  position: relative;
}
.budget-prompt::before {
  content: '';
  position: absolute;
  inset: -1px -1px auto -1px;
  border-top: 2px dashed var(--cyan);
}

.prompt-ln {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}
.prompt-ln + .prompt-ln { margin-top: 4px; }
.prompt-ln .arrow { color: var(--cyan); margin-right: 6px; }
.prompt-ln.cmt { color: var(--text-low); }

.input-line {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 12px;
}
.input-line .cur {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--cyan);
  font-weight: 700;
}
.input-line input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--display);
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.025em;
  min-width: 0;
  padding: 0;
}
.input-line .caret {
  width: 10px;
  height: 28px;
  background: var(--cyan);
  animation: caret-blink 1.1s steps(2) infinite;
}
@keyframes caret-blink { 50% { opacity: 0; } }

.presets {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.presets .t-btn { flex: 1; justify-content: center; padding: 9px 0; font-size: 11px; }

/* ─── Lock directory grid ─── */
.lock-section { margin-bottom: 22px; }
.lock-section .kicker { display: block; margin-bottom: 12px; }
.lock-section .hint {
  color: var(--text-low);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
}

.lock-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.lock-cell {
  background: var(--bg);
  padding: 16px 14px;
  text-align: center;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  cursor: pointer;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: background 0.15s, color 0.15s;
}
.lock-cell:hover { background: rgba(0, 212, 255, 0.05); color: var(--text); }
.lock-cell .code {
  width: 32px;
  height: 24px;
  font-size: 10px;
  letter-spacing: 0.12em;
  margin-bottom: 4px;
}
.lock-cell .lbl {
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}
.lock-cell .sub {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.04em;
}
.lock-cell.locked {
  background: rgba(168, 85, 247, 0.06);
  color: var(--purple);
}
.lock-cell.locked .lbl,
.lock-cell.locked .sub { color: var(--purple); }
.lock-cell.locked .code {
  border-color: var(--purple);
  background: rgba(168, 85, 247, 0.08);
  color: var(--purple);
}

.generate-row { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
.t-btn.big { padding: 14px 32px; font-size: 13px; }

/* ─── Result: parts list + summary ─── */
.result-wrap {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 22px;
}
.parts-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
}
.result-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: rgba(0, 212, 255, 0.04);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--cyan);
  font-weight: 600;
}
.row {
  display: grid;
  grid-template-columns: 90px 1fr 140px;
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
  font-size: 13.5px;
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

.result-summary {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 18px;
  height: fit-content;
}
.side-kicker { display: block; margin-bottom: 12px; }
.row-sum {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  font-family: var(--mono);
  font-size: 11.5px;
  border-bottom: 1px dashed var(--line);
}
.row-sum:last-of-type { border-bottom: none; }
.row-sum .lbl { color: var(--text-mute); letter-spacing: 0.04em; }
.row-sum .val {
  font-family: var(--display);
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
}
.row-sum .val.warn { color: var(--red); }
.row-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0 0;
  margin-top: 8px;
  border-top: 1px solid var(--cyan);
}
.row-total .lbl {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-mute);
  letter-spacing: 0.18em;
}
.result-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 1100px) {
  .result-wrap { grid-template-columns: 1fr; }
  .lock-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
