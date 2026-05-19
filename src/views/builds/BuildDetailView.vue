<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { findBuild, builds, php } from '../../data/mock'

const route = useRoute()

// Look up the build by its URL id, falling back to the hero build
// (Apex Predator V2) so unknown ids still produce something useful.
const build = computed(() => {
  const id = String(route.params.id)
  return findBuild(id) ?? builds[0]
})

// User initials for the small author avatar.
const authorInitials = computed(() => {
  const handle = build.value.user.replace(/^@/, '')
  return handle.slice(0, 2).toUpperCase()
})

// Pre-baked validation rows — these match the design preview. A real
// impl would build them from compatibility checks on the parts list.
const validations = [
  { ok: true, text: 'CPU socket (LGA1700) matches motherboard' },
  { ok: true, text: 'RAM type DDR5 matches motherboard' },
  { ok: true, text: 'RAM slot count (2) ≤ MB slots (4)' },
  { ok: true, text: 'PSU 1000W ≥ estimated 920W (12% headroom)' },
]
</script>

<template>
  <AppNav />

  <div class="page">
    <div class="breadcrumb">
      <RouterLink to="/community">Community</RouterLink>
      <span>/</span>
      <RouterLink to="/community">Public Builds</RouterLink>
      <span>/</span>
      {{ build.name }}
    </div>

    <!-- ─── Hero strip (image + meta) ─── -->
    <div class="build-hero-wrap">
      <div class="build-hero-img">{{ build.icon }}</div>

      <div class="build-info">
        <div class="hero-tags">
          <span class="h-tag purp">High-End</span>
          <span class="h-tag">4K Gaming</span>
          <span class="h-tag ok">Verified Compat</span>
        </div>
        <h1>{{ build.name }}</h1>

        <!-- Author row: avatar + handle + last-updated + view count. -->
        <div class="author-row">
          <div class="mini-avatar">{{ authorInitials }}</div>
          <span class="uname">{{ build.user }}</span>
          <span class="meta">· Updated 2 min ago · {{ build.views.toLocaleString() }} views</span>
        </div>

        <p class="build-desc">{{ build.desc }}</p>

        <div class="hero-actions">
          <button class="btn-primary">⎘ Duplicate</button>
          <button class="btn-ghost">♡ Favourite</button>
          <button class="btn-ghost">↗ Share</button>
        </div>
      </div>
    </div>

    <!-- ─── Parts list ─── -->
    <h3 class="caps-label">Parts List</h3>
    <div class="parts-list">
      <div v-for="row in build.parts" :key="row.tag" class="row">
        <span class="tag">{{ row.tag }}</span>
        <div>
          <div class="part-name">{{ row.name }}</div>
          <div class="part-sub">{{ row.sub }}</div>
        </div>
        <div class="pr">{{ php(row.price) }}</div>
      </div>
      <!-- Bottom row is the total — emphasised cyan bar. -->
      <div class="row total">
        <span class="tag total-tag">TOTAL</span>
        <div></div>
        <div class="pr big">{{ php(build.totalPrice) }}</div>
      </div>
    </div>

    <!-- ─── Validation block ─── -->
    <section class="validation-section">
      <h3 class="caps-label">Validation Report</h3>
      <div class="compat-list">
        <div v-for="v in validations" :key="v.text" class="compat-row ok">
          <span class="icon">✓</span>
          <span>{{ v.text }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.build-hero-wrap {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
  margin-bottom: 32px;
}

.build-hero-img {
  aspect-ratio: 16 / 10;
  background:
    linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.15) 60%, transparent),
    radial-gradient(circle at 70% 30%, rgba(255, 70, 85, 0.25), transparent 50%);
  border: 1px solid var(--line);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 140px;
  color: var(--text-mute);
}

.build-info h1 {
  font-size: 40px;
  font-weight: 900;
  letter-spacing: -1.5px;
  line-height: 1.05;
  margin-bottom: 14px;
  color: #fff;
}

.hero-tags { display: flex; gap: 8px; margin-bottom: 14px; }

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--grad);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--bg);
  font-size: 12px;
}
.uname { font-size: 13px; color: var(--cyan); font-weight: 700; }
.meta { font-size: 12px; color: var(--text-mute); }

.build-desc {
  color: var(--text-mute);
  line-height: 1.7;
  margin-bottom: 22px;
  font-size: 14px;
}

.hero-actions { display: flex; gap: 10px; }

.caps-label {
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-mute);
  margin-bottom: 14px;
  font-weight: 700;
}

/* ─── Parts list ─── */
.parts-list {
  background: rgba(10, 18, 32, 0.5);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
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

.row.total {
  background: rgba(0, 212, 255, 0.05);
  font-weight: 800;
}
.total-tag { color: var(--purple) !important; }
.row .pr.big { font-size: 22px; }

/* ─── Validation strip ─── */
.validation-section {
  margin-top: 36px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
}
.compat-list { margin-bottom: 4px; }
.compat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  color: #cdd;
}
.compat-row.ok .icon { color: var(--green); font-size: 14px; }

@media (max-width: 1100px) {
  .build-hero-wrap { grid-template-columns: 1fr; }
  .build-info h1 { font-size: 32px; }
}
</style>
