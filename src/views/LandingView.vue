<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppNav from '../components/AppNav.vue'

// Landing page — the marketing entry point. Pulls together the hero,
// a stats bar with live-ish counters, and three feature cards. All
// numbers are placeholders until the backend is wired in.
const stats = [
  { num: '12,400+', label: 'Builds Created' },
  { num: '3,200+',  label: 'Components Listed' },
  { num: '98%',     label: 'Compat Accuracy' },
  { num: '8,900+',  label: 'Community Members' },
]

const features = [
  {
    icon: '🔧',
    title: 'Smart Builder',
    desc: 'Real-time socket, RAM, and PSU compatibility checks as you pick parts.',
  },
  {
    icon: '💰',
    title: 'Budget Auto-Build',
    desc: "Drop your budget. Get a fully compatible build optimized for performance.",
  },
  {
    icon: '🌐',
    title: 'Community Builds',
    desc: 'Browse, favourite, and pin builds from thousands of other enthusiasts.',
  },
]
</script>

<template>
  <!-- Landing uses the no-avatar variant of the nav with both auth CTAs. -->
  <AppNav
    :show-avatar="false"
    :secondary-cta="{ label: 'Sign In', to: '/sign-in' }"
    :right-cta="{ label: 'Get Started', to: '/sign-up' }"
  />

  <!-- Hero — pulse-dot announcement badge, two-line gradient headline, CTAs. -->
  <section class="hero">
    <div class="badge">⚡ PC Build Configurator — Now in Beta</div>
    <h1>
      <span class="l1">BUILD YOUR</span>
      <span class="l2">DREAM RIG</span>
    </h1>
    <p>
      Configure, validate, and share your perfect PC build.
      From entry-level to extreme overclocks — all in one place.
    </p>
    <div class="ctas">
      <RouterLink to="/builder" class="btn-primary">Start Building →</RouterLink>
      <RouterLink to="/community" class="btn-ghost">Browse Builds</RouterLink>
    </div>
  </section>

  <!-- Stats strip. Each cell is separated by a 1px cyan-tinted divider. -->
  <div class="stats">
    <div v-for="s in stats" :key="s.label" class="stat">
      <div class="stat-num">{{ s.num }}</div>
      <div class="stat-label">{{ s.label }}</div>
    </div>
  </div>

  <!-- Three feature cards in a grid. The 1px gap is filled by the
       container's background to give the cells a hairline divider. -->
  <div class="features3">
    <div v-for="f in features" :key="f.title" class="feat-card">
      <div class="feat-icon">{{ f.icon }}</div>
      <h3>{{ f.title }}</h3>
      <p>{{ f.desc }}</p>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80px 40px 50px;
}
.hero .badge { margin-bottom: 28px; }

.hero h1 {
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
}
.hero h1 .l1 { color: #fff; display: block; }
.hero h1 .l2 {
  display: block;
  background: var(--grad-3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  font-size: 18px;
  color: var(--text-mute);
  max-width: 560px;
  line-height: 1.6;
  margin: 22px 0 40px;
}
.hero .ctas { display: flex; gap: 14px; }
/* RouterLink renders as <a>, so reset native link colors that would
   otherwise override our gradient on the primary CTA. */
.hero .ctas .btn-primary,
.hero .ctas .btn-ghost {
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin: 50px 60px 0;
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 212, 255, 0.03);
}
.stat {
  padding: 24px;
  text-align: center;
  border-right: 1px solid var(--line);
}
.stat:last-child { border-right: none; }
.stat-num {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1px;
  background: var(--grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat-label {
  font-size: 11px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 4px;
}

.features3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* The 1px gap acts as a divider once the container background
     bleeds through. */
  gap: 1px;
  margin: 1px 60px 0;
  background: var(--line);
}
.feat-card {
  background: var(--bg);
  padding: 32px;
  transition: background 0.3s;
}
.feat-card:hover { background: rgba(0, 212, 255, 0.05); }

.feat-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
  border: 1px solid rgba(0, 212, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.feat-card h3 { font-size: 16px; color: #cdd; margin-bottom: 8px; }
.feat-card p { font-size: 13px; color: var(--text-low); line-height: 1.6; }

@media (max-width: 900px) {
  .hero { padding: 50px 20px 30px; }
  .hero h1 { font-size: 44px; }
  .stats, .features3 { grid-template-columns: 1fr 1fr; margin: 30px 20px 0; }
}
</style>
