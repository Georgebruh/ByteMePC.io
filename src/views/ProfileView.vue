<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '../components/AppNav.vue'

// ─── Profile header counts ──────────────────────────
const profileCounts = [
  { lbl: 'Builds',     val: 12 },
  { lbl: 'Public',     val: 4 },
  { lbl: 'Favourites', val: 28 },
  { lbl: 'Pinned',     val: 17 },
  { lbl: 'Total Views', val: 342 },
]

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

// Tag colour per activity kind — matches the design preview.
function tagStyle(k: ActivityKind): string {
  switch (k) {
    case 'PUBLISHED':  return 'color: var(--cyan)'
    case 'FAVOURITED': return 'color: var(--purple)'
    case 'PINNED':     return 'color: var(--green)'
    case 'CREATED':    return 'color: var(--cyan)'
  }
}
</script>

<template>
  <AppNav />

  <div class="page">
    <!-- ─── Profile header card ─── -->
    <div class="profile-head">
      <div class="profile-avatar">G</div>
      <div class="profile-meta">
        <h1>{{ displayName }}</h1>
        <div class="handle">{{ username }}</div>
        <div class="profile-counts">
          <div v-for="c in profileCounts" :key="c.lbl">
            <strong>{{ c.val }}</strong>
            {{ c.lbl }}
          </div>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn-ghost">⚙ Edit Profile</button>
        <RouterLink to="/builder" class="btn-primary new-build">+ New Build</RouterLink>
      </div>
    </div>

    <!-- ─── Settings: Account + Preferences ─── -->
    <div class="settings-grid">

      <div class="card pad">
        <h3 class="caps-label">Account</h3>

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

        <button class="btn-primary save">Save Changes</button>
      </div>

      <div class="card pad">
        <h3 class="caps-label">Preferences</h3>

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
          <button class="btn-danger">Delete Account</button>
        </div>
      </div>
    </div>

    <!-- ─── Recent activity ─── -->
    <h3 class="caps-label section-spacer">Recent Activity</h3>
    <div class="activity-list">
      <div v-for="a in activity" :key="a.name + a.when" class="row">
        <span class="tag" :style="tagStyle(a.kind)">{{ a.kind }}</span>
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
/* ─── Header card ─── */
.profile-head {
  display: flex;
  gap: 28px;
  align-items: center;
  padding: 32px;
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.profile-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--grad);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 900;
  color: var(--bg);
  border: 3px solid rgba(0, 212, 255, 0.4);
}

.profile-meta h1 {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
  color: #fff;
}
.handle {
  color: var(--cyan);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 14px;
}
.profile-counts {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}
.profile-counts div { font-size: 13px; color: var(--text-mute); }
.profile-counts strong { font-size: 18px; color: #fff; display: block; }

.profile-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}
.profile-actions .new-build { text-decoration: none; display: inline-block; }

/* ─── Settings grid (Account + Preferences) ─── */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.card.pad { padding: 24px; }

.caps-label {
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 18px;
  font-weight: 700;
}
.section-spacer { margin: 36px 0 14px; }

.form-row { margin-bottom: 18px; }
.check-line {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  color: #cdd;
  cursor: pointer;
}
.check-line input { accent-color: var(--cyan); }

.btn-primary.save { margin-top: 8px; }

.danger-zone {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

/* ─── Activity list ─── */
.activity-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 120px 1fr 140px;
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
}
.row .part-name { color: #fff; font-weight: 600; }
.row .part-sub { font-size: 11px; color: var(--text-mute); margin-top: 2px; }
.row .when {
  text-align: right;
  color: var(--text-mute);
  font-size: 12px;
}

@media (max-width: 1000px) {
  .settings-grid { grid-template-columns: 1fr; }
  .profile-actions { margin-left: 0; width: 100%; }
}
</style>
