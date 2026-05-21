<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../components/AppNav.vue'

// ─── Account form state ─────────────────────────────
// Pre-populated with the user info known from the system context.
const displayName = ref('George Senagan')
const username = ref('@georgebruh')
const email = ref('senagan.george@gmail.com')

// ─── Preferences ────────────────────────────────────
const currency = ref('PHP — ₱ Philippine Peso')
const visibility = ref('Private (you decide later)')
const notifFavourite = ref(true)
const notifDigest = ref(false)

// ─── Recent activity feed ───────────────────────────
// Each row shows the "kind" tag (PUBLISHED / FAVOURITED / PINNED /
// CREATED), the subject, a short sub-line, and a "when" string.
type ActivityKind = 'PUBLISHED' | 'FAVOURITED' | 'PINNED' | 'CREATED'
interface Activity {
  kind: ActivityKind
  name: string
  sub: string
  when: string
}

const activity: Activity[] = [
  { kind: 'PUBLISHED',  name: 'Apex Predator V2',        sub: 'Made public · ₱128,300',  when: '2 min ago' },
  { kind: 'FAVOURITED', name: 'SILENT STORM',            sub: 'by @silent_ops',           when: 'Yesterday' },
  { kind: 'PINNED',     name: 'NVIDIA RTX 4090 Founders',sub: 'GPU · ₱94,500',            when: '3 days ago' },
  { kind: 'CREATED',    name: 'Workstation 2026',        sub: 'Draft build',              when: '1 week ago' },
]

// Map activity kind to the .h-tag variant that matches its meaning.
function tagClass(k: ActivityKind): string {
  switch (k) {
    case 'PUBLISHED':  return 'h-tag'
    case 'FAVOURITED': return 'h-tag purp'
    case 'PINNED':     return 'h-tag ok'
    case 'CREATED':    return 'h-tag amber'
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- ─── Profile header card ─── -->
    <div class="profile-head spec-frame">
      <span class="corner"></span>
      <span class="hex-tile profile-avatar">G</span>
      <div class="profile-meta">
        <span class="kicker">// profile · {{ username }}</span>
        <h1>{{ displayName }}</h1>
      </div>
      <div class="profile-actions">
        <button class="t-btn">Edit Profile</button>
        <RouterLink to="/builder" class="t-btn primary">+ New Build</RouterLink>
      </div>
    </div>

    <!-- Status strip showing the profile counts. -->
    <div class="terminal-strip stats-strip" aria-hidden="true">
      <span class="dot"></span>
      <span class="lbl">BUILDS · 12</span>
      <span class="sep">/</span>
      <span class="lbl">PUBLIC · 4</span>
      <span class="sep">/</span>
      <span class="lbl">FAV · 28</span>
      <span class="sep">/</span>
      <span class="lbl">PINS · 17</span>
      <span class="sep">/</span>
      <span class="lbl">VIEWS · 342</span>
      <span class="grow"></span>
      <span class="lbl">JOINED 2026-02-11</span>
    </div>

    <!-- ─── Settings: Account + Preferences ─── -->
    <div class="settings-grid">

      <div class="settings-card">
        <span class="kicker mute">// account</span>

        <div class="form-row">
          <label class="field-label" for="dn">Display Name</label>
          <input id="dn" class="input" v-model="displayName" />
        </div>
        <div class="form-row">
          <label class="field-label" for="un">Username</label>
          <input id="un" class="input" v-model="username" />
        </div>
        <div class="form-row">
          <label class="field-label" for="em">Email</label>
          <input id="em" class="input" v-model="email" disabled />
        </div>

        <button class="t-btn primary save">Save Changes</button>
      </div>

      <div class="settings-card">
        <span class="kicker mute">// preferences</span>

        <div class="form-row">
          <label class="field-label" for="cur">Default Currency</label>
          <select id="cur" class="select" v-model="currency">
            <option>PHP — ₱ Philippine Peso</option>
            <option>USD — $ US Dollar</option>
          </select>
        </div>

        <div class="form-row">
          <label class="field-label" for="vis">Default Build Visibility</label>
          <select id="vis" class="select" v-model="visibility">
            <option>Private (you decide later)</option>
            <option>Public</option>
          </select>
        </div>

        <div class="form-row">
          <label class="check-line">
            <input type="checkbox" v-model="notifFavourite" />
            Email me when someone favourites a build
          </label>
        </div>
        <div class="form-row">
          <label class="check-line">
            <input type="checkbox" v-model="notifDigest" />
            Weekly digest of trending builds
          </label>
        </div>

        <div class="danger-zone">
          <button class="t-btn warn">Delete Account</button>
        </div>
      </div>
    </div>

    <!-- ─── Recent activity ─── -->
    <span class="kicker mute section-kicker">// recent activity</span>
    <div class="activity-list">
      <div v-for="a in activity" :key="a.name + a.when" class="row">
        <span :class="tagClass(a.kind)">{{ a.kind }}</span>
        <div>
          <div class="part-name">{{ a.name }}</div>
          <div class="part-sub">{{ a.sub }}</div>
        </div>
        <span class="when">{{ a.when }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { font-family: var(--mono); }

/* ─── Header card ─── */
.profile-head {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 28px 32px;
  margin-bottom: 0;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 80px;
  height: 64px;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 32px;
  letter-spacing: 0.04em;
  clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
}

.profile-meta .kicker { display: block; margin-bottom: 6px; }
.profile-meta h1 {
  font-family: var(--display);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text);
  line-height: 1.05;
}

.profile-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

/* Stats status strip — sits directly under the profile header. */
.stats-strip {
  margin: 14px 0 28px;
  border-top: none;
}

/* ─── Settings grid (Account + Preferences) ─── */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  background: var(--line);
  border: 1px solid var(--line);
  margin-bottom: 0;
}
.settings-card {
  background: var(--bg);
  padding: 22px;
}
.settings-grid::after {
  /* The 1px middle column already gives the divider; no extra rule. */
}
.settings-card .kicker { display: block; margin-bottom: 14px; }

.section-kicker {
  display: block;
  margin: 32px 0 14px;
}

.form-row { margin-bottom: 16px; }
.check-line {
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
}
.check-line input { accent-color: var(--cyan); }

.t-btn.save { margin-top: 6px; }

.danger-zone {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--line);
}

/* ─── Activity list ─── */
.activity-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  overflow: hidden;
  font-family: var(--mono);
}
.row {
  display: grid;
  grid-template-columns: 130px 1fr 130px;
  padding: 13px 18px;
  font-size: 12px;
  border-bottom: 1px dashed var(--line);
  align-items: center;
}
.row:last-child { border-bottom: none; }
.row .part-name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.015em;
}
.row .part-sub {
  font-size: 10.5px;
  color: var(--text-mute);
  margin-top: 3px;
  letter-spacing: 0.04em;
}
.row .when {
  text-align: right;
  color: var(--text-mute);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

@media (max-width: 1000px) {
  .settings-grid { grid-template-columns: 1fr; gap: 1px; }
  .profile-actions { margin-left: 0; width: 100%; }
  .stats-strip { overflow-x: auto; }
}
</style>
