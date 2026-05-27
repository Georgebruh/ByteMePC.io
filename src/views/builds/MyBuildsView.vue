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

// KPI counts shown inline in the header strip.
const totalCount   = computed(() => builds.value.length)
const publicCount  = computed(() => builds.value.filter(b => b.isPublic).length)
const privateCount = computed(() => builds.value.filter(b => !b.isPublic).length)

// "3d ago" / "2w ago" formatter for the Updated column. Falls back to "—"
// when the row lacks an updatedAt (mock or pre-migration data).
function relTime(iso?: string): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.max(0, (Date.now() - then) / 1000)
  if (diffSec < 60)       return 'just now'
  if (diffSec < 3600)     return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400)    return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800)   return `${Math.floor(diffSec / 86400)}d ago`
  if (diffSec < 2592000)  return `${Math.floor(diffSec / 604800)}w ago`
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)}mo ago`
  return `${Math.floor(diffSec / 31536000)}y ago`
}

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

    <!-- Signed-out: prompt to sign in (no header strip while empty). -->
    <div v-if="!isSignedIn && !loading" class="empty-state">
      <div class="empty-title">Sign in to view your builds</div>
      <div class="empty-cta">
        <RouterLink to="/sign-in" class="t-btn primary">Sign In</RouterLink>
        <RouterLink to="/sign-up" class="t-btn">Create Account</RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- One-line strip: title + inline KPI chips + New Build CTA. -->
      <div class="top-strip">
        <div class="title">My Builds</div>
        <div class="pipe"></div>
        <span class="kpi"><b>{{ totalCount }}</b> total</span>
        <span class="kpi"><b>{{ publicCount }}</b> public</span>
        <span class="kpi"><b>{{ privateCount }}</b> private</span>
        <div class="grow"></div>
        <RouterLink to="/builder" class="t-btn primary">+ New Build</RouterLink>
      </div>

      <div v-if="loading" class="empty-state">Loading builds…</div>
      <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

      <template v-else>
        <div v-if="builds.length" class="builds-table">
          <div class="head">
            <span>Build</span>
            <span>Visibility</span>
            <span>Parts</span>
            <span>Updated</span>
            <span class="right">Total</span>
            <span class="right">Actions</span>
          </div>

          <div v-for="b in builds" :key="b.id" class="row">
            <div class="name-line">
              <RouterLink :to="{ path: `/builds/${b.id}`, query: { from: 'my-builds' } }" class="name">{{ b.name }}</RouterLink>
              <span v-for="t in b.tags.slice(0, 2)" :key="t" class="h-tag inline">{{ t }}</span>
            </div>
            <span>
              <span :class="b.isPublic ? 'h-tag purp' : 'h-tag mute'">
                {{ b.isPublic ? 'Public' : 'Private' }}
              </span>
            </span>
            <span class="muted">{{ b.parts.length }}</span>
            <span class="updated">{{ relTime(b.updatedAt) }}</span>
            <span class="total-amber">{{ php(b.totalPrice) }}</span>
            <div class="row-actions">
              <RouterLink :to="{ path: `/builds/${b.id}`, query: { from: 'my-builds' } }" class="icon-btn" title="Open">↗</RouterLink>
              <RouterLink :to="`/builder/manual/${b.id}`" class="icon-btn" title="Edit">✎</RouterLink>
              <button class="icon-btn danger" title="Delete" @click="onDelete(b.id, b.name)">🗑</button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-title">No builds yet</div>
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

.top-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--line);
  background: rgba(5, 8, 16, 0.5);
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.top-strip .title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.015em;
  color: var(--text);
}
.top-strip .pipe {
  height: 18px;
  width: 1px;
  background: var(--line);
}
.top-strip .kpi {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-low);
}
.top-strip .kpi b {
  font-family: var(--display);
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  letter-spacing: -0.01em;
}
.top-strip .grow { flex: 1; }

.builds-table {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  font-family: var(--mono);
}
.builds-table .head,
.builds-table .row {
  display: grid;
  grid-template-columns: 1fr 100px 60px 100px 130px 110px;
  align-items: center;
  padding: 14px 18px;
  font-size: 12px;
  gap: 12px;
}
.builds-table .head {
  background: rgba(0, 212, 255, 0.04);
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-mute);
}
.head .right,
.row .right { text-align: right; }

.builds-table .row {
  border-bottom: 1px dashed var(--line);
  color: var(--text-dim);
}
.builds-table .row:last-child { border-bottom: none; }
.builds-table .row:hover { background: rgba(0, 212, 255, 0.03); }

.row .name-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}
.row .name {
  font-family: var(--display);
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  letter-spacing: -0.015em;
  text-decoration: none;
}
.row .name:hover { color: var(--cyan); }

.h-tag.inline { font-size: 9px; letter-spacing: 0.12em; padding: 2px 7px; }
.h-tag.mute {
  background: transparent;
  border-color: var(--line);
  color: var(--text-mute);
}

.muted { color: var(--text-mute); }
.updated {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-low);
  letter-spacing: 0.06em;
}

.total-amber {
  font-family: var(--display);
  font-weight: 700;
  color: var(--amber);
  font-size: 14px;
  letter-spacing: -0.015em;
  text-align: right;
}

.row-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.empty-state .empty-title {
  font-family: var(--display);
  font-size: 16px;
  color: var(--text);
  margin-bottom: 12px;
}
.empty-state .empty-cta {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
}
.empty-state.err { color: var(--red); border-color: rgba(255, 70, 85, 0.35); }

@media (max-width: 1100px) {
  .builds-table .head,
  .builds-table .row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .builds-table .head { display: none; }
  .row-actions { justify-content: flex-start; }
  .total-amber,
  .row .right { text-align: left; }
}
</style>
