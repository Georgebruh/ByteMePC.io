<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'

// Local form state. No backend yet — submitting just bounces to the
// my-builds dashboard so the click flow is testable end-to-end.
const email = ref('')
const password = ref('')
const remember = ref(false)

const router = useRouter()

function onSubmit(e: Event) {
  e.preventDefault()
  // TODO: replace with real Supabase sign-in once auth is wired.
  router.push('/builds')
}
</script>

<template>
  <AppNav :show-avatar="false" :right-cta="{ label: 'Sign Up', to: '/sign-up' }" />

  <div class="auth-wrap">
    <form class="auth-card" @submit="onSubmit">
      <h2>Welcome Back</h2>
      <p class="sub">Sign in to continue building.</p>

      <div class="form-row">
        <label class="field-label" for="email">Email</label>
        <input id="email" class="input" type="email" placeholder="you@bytemepc.io" v-model="email" autocomplete="email" />
      </div>

      <div class="form-row">
        <label class="field-label" for="password">Password</label>
        <input id="password" class="input" type="password" placeholder="••••••••" v-model="password" autocomplete="current-password" />
      </div>

      <!-- Single-line remember/forgot row. -->
      <div class="row-between">
        <label class="check-line">
          <input type="checkbox" v-model="remember" /> Remember me
        </label>
        <a href="#">Forgot password?</a>
      </div>

      <button type="submit" class="btn-primary auth-btn">Sign In →</button>

      <div class="divider">OR</div>

      <button type="button" class="btn-ghost full">Continue with Google</button>

      <div class="auth-foot">
        Don't have an account?
        <RouterLink to="/sign-up">Create one</RouterLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
.auth-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 40px;
  background: rgba(10, 18, 32, 0.75);
  border: 1px solid var(--line);
  border-radius: 4px;
  position: relative;
}
/* Gradient accent strip on the top edge of the card. */
.auth-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--grad);
  border-radius: 4px 4px 0 0;
}

.auth-card h2 {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.auth-card .sub {
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: 28px;
}

.form-row { margin-bottom: 18px; }

.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-mute);
  margin-bottom: 8px;
}
.row-between a { color: var(--cyan); font-weight: 700; }
.check-line {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}
.check-line input { accent-color: var(--cyan); }

.auth-btn { width: 100%; margin-top: 8px; }

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
  color: var(--text-low);
  font-size: 11px;
  letter-spacing: 2px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.btn-ghost.full { width: 100%; }

.auth-foot {
  text-align: center;
  margin-top: 22px;
  font-size: 13px;
  color: var(--text-mute);
}
.auth-foot a { color: var(--cyan); font-weight: 700; }
</style>
