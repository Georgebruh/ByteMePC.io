<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '../components/AppNav.vue'
import { signOut, useSession } from '../lib/session'
import {
  fetchProfile,
  fetchProfileActivity,
  fetchProfileStats,
  updateProfile,
  type ActivityKind,
  type ProfileActivity,
  type ProfileRow,
  type ProfileStats,
} from '../data/profile'

const router = useRouter()
const { session, userId, isSignedIn } = useSession()

// Anonymous viewers have no business on /profile — bounce them through
// the sign-in flow with a redirect back so they land here after auth.
watch(
  isSignedIn,
  (signedIn) => {
    if (signedIn === false) router.replace('/sign-in?redirect=/profile')
  },
  { immediate: true },
)

// ─── Loaded state ──────────────────────────────────────
const profile = ref<ProfileRow | null>(null)
const stats = ref<ProfileStats | null>(null)
const activity = ref<ProfileActivity[]>([])
const loading = ref(true)
const errorMsg = ref('')

// Edit-form state — initialised once the profile loads. Kept separate
// from the loaded profile so the user can revert by re-loading without
// losing the rest of the screen.
const editUsername = ref('')
const saving = ref(false)
const saveMsg = ref('')

async function load() {
  if (!userId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const [p, s, a] = await Promise.all([
      fetchProfile(userId.value),
      fetchProfileStats(userId.value),
      fetchProfileActivity(userId.value, 8),
    ])
    profile.value = p
    stats.value = s
    activity.value = a
    editUsername.value = p?.username ?? ''
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Failed to load profile.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(userId, load)

// ─── Derived bits ──────────────────────────────────────
// Email lives on auth.users (not in profiles), so pull from session.
const email = computed(() => session.value?.user?.email ?? '')

// Avatar initials — derived from the username so an account named
// @shadow_ripper shows "SH" instead of always rendering "G".
const initials = computed(() => {
  const handle = (profile.value?.username ?? email.value ?? '?').replace(/^@/, '')
  return handle.slice(0, 2).toUpperCase()
})

const joinedLabel = computed(() => {
  const iso = profile.value?.created_at
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10) // YYYY-MM-DD, locale-stable
})

const kpis = computed(() => [
  { key: 'builds', label: 'Builds',     value: stats.value?.builds ?? 0,        accent: 'cyan'   },
  { key: 'public', label: 'Public',     value: stats.value?.publicBuilds ?? 0,  accent: 'green'  },
  { key: 'favs',   label: 'Favourites', value: stats.value?.favourites ?? 0,    accent: 'red'    },
  { key: 'pins',   label: 'Pinned',     value: stats.value?.pins ?? 0,          accent: 'purple' },
  { key: 'views',  label: 'Views',      value: stats.value?.views ?? 0,         accent: 'amber'  },
])

// "2m ago" / "Yesterday" / "3d ago" formatter for the activity feed.
function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.max(0, (Date.now() - then) / 1000)
  if (diffSec < 60)       return 'just now'
  if (diffSec < 3600)     return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400)    return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800)   return 'Yesterday'
  if (diffSec < 604800)   return `${Math.floor(diffSec / 86400)}d ago`
  if (diffSec < 2592000)  return `${Math.floor(diffSec / 604800)}w ago`
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)}mo ago`
  return `${Math.floor(diffSec / 31536000)}y ago`
}

// Coloured chip variant per activity kind — matches existing .h-tag
// vocabulary used elsewhere in the app (purp = favourites, amber = create).
function tagClass(k: ActivityKind): string {
  switch (k) {
    case 'PUBLISHED':  return 'h-tag ok'
    case 'FAVOURITED': return 'h-tag purp'
    case 'CREATED':    return 'h-tag'
  }
}

// ─── Save / sign out ──────────────────────────────────
async function onSave() {
  if (!userId.value) return
  const next = editUsername.value.replace(/^@/, '').trim()
  if (!next) {
    saveMsg.value = 'Username can\'t be empty.'
    return
  }
  saving.value = true
  saveMsg.value = ''
  try {
    await updateProfile(userId.value, { username: next })
    saveMsg.value = 'Saved.'
    if (profile.value) profile.value.username = next
  } catch (e: any) {
    saveMsg.value = e?.message ?? 'Failed to save.'
  } finally {
    saving.value = false
  }
}

async function onSignOut() {
  await signOut()
  router.push('/')
}

// Dirty marker — disables Save until the input differs from the
// currently-loaded profile username.
const isDirty = computed(() => {
  const next = editUsername.value.replace(/^@/, '').trim()
  return !!profile.value && next !== profile.value.username
})
</script>

<template>
  <AppNav />

  <div class="page">
    <div v-if="loading" class="empty-state">Loading profile…</div>
    <div v-else-if="errorMsg" class="empty-state err">{{ errorMsg }}</div>

    <template v-else>
      <!-- ─── Header card ───────────────────────────────────── -->
      <section class="profile-head spec-frame">
        <span class="corner"></span>

        <span class="hex-tile profile-avatar">{{ initials }}</span>

        <div class="profile-meta">
          <span class="kicker">// profile · @{{ profile?.username ?? '—' }}</span>
          <h1>{{ profile?.username ?? 'Account' }}</h1>
          <div class="meta-line">
            <span class="meta-pill">{{ email }}</span>
            <span class="meta-sep">/</span>
            <span class="meta-pill">Joined {{ joinedLabel }}</span>
          </div>
        </div>

        <div class="profile-actions">
          <RouterLink to="/builder" class="t-btn primary">+ New Build</RouterLink>
          <button type="button" class="t-btn warn" @click="onSignOut">Sign Out</button>
        </div>
      </section>

      <!-- ─── KPI tiles ─────────────────────────────────────── -->
      <section class="kpi-grid">
        <div
          v-for="k in kpis"
          :key="k.key"
          class="kpi-tile"
          :class="`accent-${k.accent}`"
        >
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ k.value.toLocaleString('en-PH') }}</div>
        </div>
      </section>

      <!-- ─── Settings + Activity grid ──────────────────────── -->
      <section class="lower-grid">

        <!-- Account form ─── -->
        <div class="settings-card">
          <span class="kicker mute">// account</span>

          <div class="form-row">
            <label class="field-label" for="un">Username</label>
            <input id="un" class="input" v-model="editUsername" />
          </div>

          <div class="form-row">
            <label class="field-label" for="em">Email</label>
            <input id="em" class="input" :value="email" disabled />
          </div>

          <div class="save-row">
            <button
              type="button"
              class="t-btn primary"
              :disabled="!isDirty || saving"
              @click="onSave"
            >{{ saving ? 'Saving…' : 'Save Changes' }}</button>
            <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
          </div>
        </div>

        <!-- Activity feed ─── -->
        <div class="activity-card">
          <div class="activity-head">
            <span class="kicker mute">// recent activity</span>
            <span class="count">{{ activity.length }} entries</span>
          </div>

          <div v-if="activity.length" class="activity-list">
            <RouterLink
              v-for="a in activity"
              :key="a.buildId + a.kind + a.at"
              :to="`/builds/${a.buildId}`"
              class="activity-row"
            >
              <span :class="tagClass(a.kind)">{{ a.kind }}</span>
              <div class="part">
                <div class="part-name">{{ a.name }}</div>
                <div class="part-sub">{{ a.sub }}</div>
              </div>
              <span class="when">{{ relTime(a.at) }}</span>
            </RouterLink>
          </div>

          <div v-else class="empty-activity">
            <div class="empty-glyph">▢</div>
            No activity yet — save a build or favourite one to see it here.
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

/* ─── Header card ──────────────────────────────────────── */
.profile-head {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 26px 32px;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 76px;
  height: 64px;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: 0.04em;
  clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
}
.profile-meta { min-width: 0; }
.profile-meta .kicker { display: block; margin-bottom: 6px; }
.profile-meta h1 {
  font-family: var(--display);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text);
  line-height: 1.05;
  margin-bottom: 8px;
  word-break: break-word;
}
.meta-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-mute);
}
.meta-pill {
  padding: 3px 9px;
  border: 1px solid var(--line);
  background: rgba(0, 212, 255, 0.04);
  color: var(--text-dim);
  text-transform: lowercase;
}
.meta-sep { color: rgba(255, 255, 255, 0.1); }

.profile-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* ─── KPI tiles ────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0 22px;
}
.kpi-tile {
  position: relative;
  padding: 16px 18px;
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  border-top: 2px solid var(--line);
  font-family: var(--mono);
  overflow: hidden;
}
.kpi-tile::after {
  /* Subtle scan-line gradient that picks up the accent colour. */
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 60%);
}
.kpi-label {
  font-size: 9.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-low);
  margin-bottom: 8px;
}
.kpi-value {
  font-family: var(--display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--text);
}
.kpi-tile.accent-cyan   { border-top-color: var(--cyan); }
.kpi-tile.accent-green  { border-top-color: var(--green); }
.kpi-tile.accent-red    { border-top-color: var(--red); }
.kpi-tile.accent-purple { border-top-color: var(--purple); }
.kpi-tile.accent-amber  { border-top-color: var(--amber); }
.kpi-tile.accent-cyan   .kpi-value { color: var(--cyan); }
.kpi-tile.accent-green  .kpi-value { color: var(--green); }
.kpi-tile.accent-red    .kpi-value { color: var(--red); }
.kpi-tile.accent-purple .kpi-value { color: var(--purple); }
.kpi-tile.accent-amber  .kpi-value { color: var(--amber); }

/* ─── Lower grid (Account · Activity) ──────────────────── */
.lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 18px;
}

.settings-card,
.activity-card {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  padding: 22px;
}

.settings-card .kicker { display: block; margin-bottom: 14px; }

.form-row { margin-bottom: 16px; }

.save-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 6px;
}
.save-msg {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-mute);
}

/* ─── Activity ─────────────────────────────────────────── */
.activity-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.activity-head .count {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-low);
}

.activity-list {
  display: flex;
  flex-direction: column;
}
.activity-row {
  display: grid;
  grid-template-columns: 110px 1fr 100px;
  gap: 14px;
  align-items: center;
  padding: 12px 4px;
  border-top: 1px dashed var(--line);
  text-decoration: none;
  color: inherit;
  font-family: var(--mono);
}
.activity-row:first-child { border-top: none; }
.activity-row:hover .part-name { color: var(--cyan); }

.part-name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
  line-height: 1.2;
  transition: color 0.12s;
}
.part-sub {
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 3px;
  letter-spacing: 0.04em;
}
.when {
  text-align: right;
  color: var(--text-mute);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

.empty-activity {
  padding: 28px 8px;
  text-align: center;
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  border: 1px dashed var(--line);
}
.empty-activity .empty-glyph {
  font-size: 26px;
  margin-bottom: 10px;
  color: var(--text-low);
}

.empty-state.err {
  color: var(--red);
  border-color: rgba(255, 70, 85, 0.35);
}

/* ─── Responsive ───────────────────────────────────────── */
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lower-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .profile-head { padding: 22px 20px; }
  .profile-actions { margin-left: 0; width: 100%; }
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .activity-row {
    grid-template-columns: 90px 1fr;
    grid-template-areas:
      'kind part'
      'when when';
  }
  .activity-row .when { text-align: left; }
}
</style>
