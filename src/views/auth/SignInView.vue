<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'

const email = ref('')
const password = ref('')
const remember = ref(false)
const errorMsg = ref('')
const loading = ref(false)

const router = useRouter()
const route = useRoute()
const { isSignedIn } = useSession()

// Only honour same-origin relative paths so a crafted ?redirect=https://evil
// link can't bounce the user off-site after auth.
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  if (typeof raw !== 'string') return '/builds'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/builds'
})

const signUpTarget = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string'
    ? `/sign-up?redirect=${encodeURIComponent(raw)}`
    : '/sign-up'
})

// Already-signed-in users have no business on this screen — bounce
// them to the redirect target (or /builds) the moment we know it.
// Watching `isSignedIn` covers both the cached-session-on-mount and
// the rare cross-tab sign-in case.
watch(isSignedIn, (signedIn) => {
  if (signedIn) router.replace(redirectTarget.value)
}, { immediate: true })

async function onSubmit(e: Event) {
  e.preventDefault()
  errorMsg.value = ''
  loading.value = true
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (error) {
    errorMsg.value = error.message
    return
  }
  router.push(redirectTarget.value)
}
</script>

<template>
  <AppNav :show-avatar="false" :right-cta="{ label: 'Sign Up', to: signUpTarget }" />

  <div class="auth-wrap">
    <form class="auth-card spec-frame" @submit="onSubmit">
      <span class="corner"></span>
      <span class="kicker">// access · resume</span>
      <h2>Welcome back.</h2>
      <p class="sub">Pick up where you left off.</p>

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

      <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

      <button type="submit" class="t-btn primary full" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign In' }} <span class="arrow">→</span>
      </button>

      <div class="divider">OR</div>

      <button type="button" class="t-btn full">Continue with Google</button>

      <div class="auth-foot">
        Don't have an account?
        <RouterLink :to="signUpTarget">Create one</RouterLink>
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
  font-family: var(--mono);
}

/* Spec-sheet frame with corner brackets — provided by .spec-frame.
   No gradient accent strip; the brackets do the framing. */
.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 36px 40px;
  background: rgba(10, 18, 32, 0.75);
}

.auth-card .kicker {
  margin-bottom: 10px;
}

.auth-card h2 {
  font-family: var(--display);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 6px;
  color: var(--text);
  line-height: 1.05;
}
.auth-card .sub {
  font-size: 12px;
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
  margin-bottom: 16px;
}
.row-between a { color: var(--cyan); font-weight: 600; }
.check-line {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}
.check-line input { accent-color: var(--cyan); }

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
  color: var(--text-low);
  font-size: 10px;
  letter-spacing: 0.2em;
  font-family: var(--mono);
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.auth-foot {
  text-align: center;
  margin-top: 22px;
  font-size: 12px;
  color: var(--text-mute);
}
.auth-foot a { color: var(--cyan); font-weight: 600; }

.err {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--red);
  background: rgba(255, 70, 85, 0.06);
  border: 1px solid rgba(255, 70, 85, 0.3);
  padding: 8px 10px;
  margin-bottom: 12px;
}
</style>
