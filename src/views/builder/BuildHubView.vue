<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { php, type Build } from '../../data/mock'
import { fetchMyBuilds } from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId, isSignedIn } = useSession()

// ─── Recent / continue building ─────────────────────────────
// Loaded from Supabase — three most recently updated builds owned by
// the current user. Empty when the user isn't signed in.
const recent = ref<Build[]>([])
const recentLoading = ref(true)

async function loadRecent() {
  if (!userId.value) {
    recent.value = []
    recentLoading.value = false
    return
  }
  recentLoading.value = true
  try {
    const all = await fetchMyBuilds(userId.value)
    recent.value = all.slice(0, 3)
  } catch {
    recent.value = []
  } finally {
    recentLoading.value = false
  }
}

onMounted(loadRecent)
watch(userId, loadRecent)
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <span class="kicker">// builder</span>
        <div class="section-title">Start a New Build</div>
      </div>
    </div>

    <!-- ─── Two-card chooser ─── -->
    <div class="mode-grid-wrap">
      <div class="mode-grid">

        <!-- Manual -->
        <RouterLink to="/builder/manual" class="mode-card manual">
          <span class="corner"></span>

          <div class="mode-head">
            <span class="hex-tile" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </span>
            <div class="hd">
              <span class="tag">// 01</span>
              <h2>Manual Build</h2>
              <div class="sub">Pick every part yourself.</div>
            </div>
          </div>

          <div class="mode-foot">
            <span class="t-btn primary big full">Start Manual <span class="arrow">→</span></span>
          </div>
        </RouterLink>

        <!-- Auto -->
        <RouterLink to="/builder/auto" class="mode-card auto">
          <span class="corner"></span>

          <div class="mode-head">
            <span class="hex-tile" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </span>
            <div class="hd">
              <span class="tag">// 02</span>
              <h2>Auto Build</h2>
              <div class="sub">Drop a budget — we pick the parts.</div>
            </div>
          </div>

          <div class="mode-foot">
            <span class="t-btn amber big full">Start Auto <span class="arrow">→</span></span>
          </div>
        </RouterLink>

      </div>

      <!-- centre OR pill -->
      <div class="or-divider">OR</div>
    </div>

    <!-- ─── Continue building ─── -->
    <div class="sec-head">
      <div class="ttl"><span class="kicker">// recent</span>Continue</div>
      <RouterLink v-if="isSignedIn" to="/builds" class="see-all">View All →</RouterLink>
    </div>

    <div v-if="!isSignedIn" class="recent-empty">
      <RouterLink to="/sign-in">Sign in</RouterLink> to see your saved builds here.
    </div>
    <div v-else-if="recentLoading" class="recent-empty">Loading…</div>
    <div v-else-if="!recent.length" class="recent-empty">
      No saved builds yet — start one above.
    </div>
    <div v-else class="recent-list">
      <RouterLink
        v-for="b in recent"
        :key="b.id"
        :to="`/builder/manual/${b.id}`"
        class="recent-row"
      >
        <span class="mode-tag" :class="b.isPublic ? 'aut' : 'man'">
          // {{ b.isPublic ? 'public' : 'private' }}
        </span>
        <div class="nm">{{ b.name }}</div>
        <div class="pct">
          {{ b.parts.length }} / 8 parts
          <span class="bar" :style="{ '--w': `${Math.min(100, b.parts.length * 12.5)}%` }"></span>
        </div>
        <div class="pr">{{ php(b.totalPrice) }}</div>
        <div class="act">
          <span class="t-btn">Resume</span>
        </div>
      </RouterLink>
    </div>

  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

.page-header .kicker { display: block; margin-bottom: 6px; }
.section-title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 6px;
}

/* ─── Two-card chooser ─── */
.mode-grid-wrap { position: relative; margin-bottom: 36px; }
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.mode-card {
  position: relative;
  background: rgba(10, 18, 32, 0.55);
  border: 1px solid var(--line);
  padding: 32px 30px 28px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, transform 0.2s;
  cursor: pointer;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}
.mode-card::before {
  content: '';
  position: absolute;
  inset: -1px -1px auto -1px;
  height: 2px;
  background: var(--cyan);
  opacity: 0.7;
}
.mode-card.auto::before { background: var(--amber); opacity: 0.85; }
.mode-card:hover { transform: translateY(-2px); }
.mode-card.manual:hover { border-color: rgba(0, 212, 255, 0.45); }
.mode-card.auto:hover   { border-color: rgba(255, 181, 71, 0.55); }

/* Corner brackets — visual lift, like spec-frame. */
.mode-card .corner::before,
.mode-card .corner::after,
.mode-card::after {
  content: '';
  position: absolute;
  width: 14px; height: 14px;
  pointer-events: none;
}
.mode-card.manual::after,
.mode-card.manual > .corner::before,
.mode-card.manual > .corner::after { border: 1px solid var(--cyan); }
.mode-card.auto::after,
.mode-card.auto > .corner::before,
.mode-card.auto > .corner::after   { border: 1px solid var(--amber); }
.mode-card::after            { top: -1px; right: -1px; border-left: none; border-bottom: none; }
.mode-card > .corner::before { bottom: -1px; left: -1px;  border-right: none; border-top: none; }
.mode-card > .corner::after  { bottom: -1px; right: -1px; border-left: none;  border-top: none; }

/* Card head */
.mode-head {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 28px;
}
.hex-tile {
  width: 64px; height: 56px;
  flex-shrink: 0;
}
.hex-tile svg {
  width: 26px;
  height: 26px;
  color: var(--cyan);
}
.mode-card.auto .hex-tile svg { color: var(--amber); }
.mode-card.auto .hex-tile {
  border-color: rgba(255, 181, 71, 0.45);
  background: rgba(255, 181, 71, 0.06);
  color: var(--amber);
}
.mode-head .hd { flex: 1; }
.mode-head .tag {
  display: inline-block;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
  margin-bottom: 8px;
}
.mode-card.auto .mode-head .tag { color: var(--amber); }
.mode-head h2 {
  font-family: var(--display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text);
  line-height: 1.05;
  margin-bottom: 8px;
}
.mode-head .sub {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.mode-foot { margin-top: auto; }

/* Amber variant of the primary terminal button. */
.t-btn.amber {
  background: var(--amber);
  color: var(--bg);
  border-color: var(--amber);
  font-weight: 700;
}
.t-btn.amber:hover { filter: drop-shadow(0 0 18px rgba(255, 181, 71, 0.45)); }
.t-btn.big { padding: 14px 24px; font-size: 12.5px; }

/* Centre OR pill sitting on the gap between the two cards. */
.or-divider {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--text-mute);
  font-weight: 700;
  z-index: 5;
}

/* ─── Section heads ─── */
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
  gap: 16px;
}
.sec-head .ttl {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.015em;
}
.sec-head .ttl .kicker { margin-right: 10px; display: inline-block; }

/* ─── Recent / continue list ─── */
.sec-head .see-all {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cyan);
}
.recent-empty {
  padding: 24px 18px;
  margin-bottom: 36px;
  border: 1px dashed var(--line);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-mute);
  text-align: center;
}
.recent-empty a { color: var(--cyan); }

.recent-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  margin-bottom: 36px;
}
.recent-row {
  display: grid;
  grid-template-columns: 110px 1fr 200px 110px auto;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px dashed var(--line);
  font-family: var(--mono);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s;
}
.recent-row:last-child { border-bottom: none; }
.recent-row:hover { background: rgba(0, 212, 255, 0.04); }
.recent-row .mode-tag {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid var(--line);
  display: inline-block;
  width: fit-content;
}
.recent-row .mode-tag.man { color: var(--cyan); border-color: rgba(0, 212, 255, 0.35); background: rgba(0, 212, 255, 0.06); }
.recent-row .mode-tag.aut { color: var(--amber); border-color: rgba(255, 181, 71, 0.45); background: rgba(255, 181, 71, 0.06); }
.recent-row .nm {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
}
.recent-row .pct {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}
.recent-row .pct .bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 212, 255, 0.08);
  position: relative;
}
.recent-row .pct .bar::after {
  content: '';
  position: absolute;
  inset: 0;
  width: var(--w, 50%);
  background: var(--cyan);
}
.recent-row .pct .bar.over::after { background: var(--red); }
.recent-row .pr {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 14px;
  letter-spacing: -0.015em;
  text-align: right;
}
.recent-row .act { display: flex; gap: 6px; }

/* ─── Responsive ─── */
@media (max-width: 1100px) {
  .mode-grid { grid-template-columns: 1fr; }
  .or-divider { display: none; }
  .recent-row { grid-template-columns: 1fr; gap: 8px; }
}
</style>
