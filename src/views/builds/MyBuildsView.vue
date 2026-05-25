<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import BuildsSubNav from '../../components/BuildsSubNav.vue'
import type { Build } from '../../data/mock'
import { php } from '../../data/mock'
import { fetchMyBuilds, deleteBuild } from '../../data/builds'
import { useSession } from '../../lib/session'

const { userId, isSignedIn } = useSession()

const builds = ref<Build[]>([])
const loading = ref(true)
const errorMsg = ref('')

async function load() {
  if (!userId.value) {
    builds.value = []
    loading.value = false
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    builds.value = await fetchMyBuilds(userId.value)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load builds.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(userId, load)

// KPI tiles — derived from the actual builds list, not hard-coded.
const stats = computed(() => [
  { lbl: 'Total Builds', val: String(builds.value.length) },
  { lbl: 'Public',       val: String(builds.value.filter(b => b.isPublic).length) },
  { lbl: 'Private',      val: String(builds.value.filter(b => !b.isPublic).length) },
  { lbl: 'Total Spend',  val: php(builds.value.reduce((s, b) => s + b.totalPrice, 0)) },
])

async function onDelete(buildId: string, name: string) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  try {
    await deleteBuild(buildId)
    builds.value = builds.value.filter(b => b.id !== buildId)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to delete build.'
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <BuildsSubNav />

    <div class="page-header">
      <div>
        <span class="kicker">// dashboard</span>
        <div class="section-title">My Builds</div>
        <div class="section-sub">All your saved configurations.</div>
      </div>
      <RouterLink to="/builder" class="t-btn primary new-build">+ New Build</RouterLink>
    </div>

    <!-- Signed-out state — prompt to sign in. -->
    <div v-if="!isSignedIn && !loading" class="empty-state">
      <div class="ic">🔒</div>
      <div class="empty-title">Sign in to view your builds</div>
      <div class="empty-sub">Your saved configurations live here once you're authenticated.</div>
      <div class="empty-cta">
        <RouterLink to="/sign-in" class="t-btn primary">Sign In</RouterLink>
        <RouterLink to="/sign-up" class="t-btn">Create Account</RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- KPI tiles. -->
      <div class="kpi-grid">
        <div v-for="s in stats" :key="s.lbl" class="kpi-cell">
          <div class="lbl">{{ s.lbl }}</div>
          <div class="val">{{ s.val }}</div>
        </div>
      </div>

      <div v-if="loading" class="empty-state">Loading builds…</div>
      <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

      <template v-else>
        <div v-if="builds.length" class="builds-table">
          <div class="head">
            <span>Build Name</span>
            <span>Visibility</span>
            <span>Parts</span>
            <span>Total</span>
            <span class="right">Actions</span>
          </div>

          <div v-for="b in builds" :key="b.id" class="row">
            <div>
              <RouterLink :to="`/builds/${b.id}`" class="name">{{ b.name }}</RouterLink>
              <div class="detail">{{ b.tags.join(' · ') || '—' }}</div>
            </div>
            <span>
              <span :class="b.isPublic ? 'h-tag purp' : 'h-tag'">
                {{ b.isPublic ? 'Public' : 'Private' }}
              </span>
            </span>
            <span class="muted">{{ b.parts.length }}</span>
            <span class="total-amber">{{ php(b.totalPrice) }}</span>
            <div class="row-actions">
              <RouterLink :to="`/builds/${b.id}`" class="icon-btn" title="Open">↗</RouterLink>
              <RouterLink :to="`/builder/manual/${b.id}`" class="icon-btn" title="Edit">✎</RouterLink>
              <button class="icon-btn danger" title="Delete" @click="onDelete(b.id, b.name)">🗑</button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="ic">🛠</div>
          <div class="empty-title">No builds yet</div>
          <div class="empty-sub">Head to the Builder to assemble your first rig.</div>
          <div class="empty-cta">
            <RouterLink to="/builder" class="t-btn primary">+ New Build</RouterLink>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

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
  font-size: 26px;
  color: var(--amber);
  letter-spacing: -0.025em;
  line-height: 1;
}

.builds-table {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
  font-family: var(--mono);
}
.builds-table .head,
.builds-table .row {
  display: grid;
  grid-template-columns: 2fr 1fr 0.6fr 1fr 110px;
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
.muted { color: var(--text-mute); }

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

.empty-state .ic { font-size: 40px; margin-bottom: 12px; }
.empty-state .empty-title {
  font-family: var(--display);
  font-size: 18px;
  color: var(--text);
  margin-bottom: 6px;
}
.empty-state .empty-sub {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-low);
}
.empty-state .empty-cta {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 18px;
}
.empty-state.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

@media (max-width: 1100px) {
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
