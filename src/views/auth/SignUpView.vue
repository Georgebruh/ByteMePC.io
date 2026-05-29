<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'

const username = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)
const errorMsg = ref('')
const loading = ref(false)

const router = useRouter()
const route = useRoute()
const { isSignedIn } = useSession()

// Only relative same-origin paths are honoured so the param can't be
// abused to bounce the user off-site after sign-up.
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  if (typeof raw !== 'string') return '/builds'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/builds'
})

const signInTarget = computed(() => {
  const raw = route.query.redirect
  return typeof raw === 'string'
    ? `/sign-in?redirect=${encodeURIComponent(raw)}`
    : '/sign-in'
})

// Already-signed-in users get bounced off the sign-up screen — same
// pattern as SignInView so the auth flows stay symmetric.
watch(isSignedIn, (signedIn) => {
  if (signedIn) router.replace(redirectTarget.value)
}, { immediate: true })

async function onSubmit(e: Event) {
  e.preventDefault()
  if (!acceptedTerms.value) return
  errorMsg.value = ''
  loading.value = true
  // username is forwarded via raw_user_meta_data so the handle_new_user()
  // trigger picks it up when it auto-creates the profiles row.
  const handle = username.value.replace(/^@/, '').trim()
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { data: { username: handle } },
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
  <AppNav :show-avatar="false" :right-cta="{ label: 'Sign In', to: signInTarget }" />

  <div class="auth-wrap">
    <form class="auth-card spec-frame" @submit="onSubmit">
      <span class="corner"></span>
      <span class="kicker">// access · enrol</span>
      <h2>Join Byte Me PC.</h2>
      <p class="sub">Start building, sharing, and saving rigs in seconds.</p>

      <div class="form-row">
        <label class="field-label" for="username">Username</label>
        <input id="username" class="input" type="text" placeholder="@shadow_ripper" v-model="username" />
      </div>

      <div class="form-row">
        <label class="field-label" for="email">Email</label>
        <input id="email" class="input" type="email" placeholder="you@bytemepc.io" v-model="email" autocomplete="email" />
      </div>

      <div class="form-row">
        <label class="field-label" for="password">Password</label>
        <input id="password" class="input" type="password" placeholder="At least 8 characters" v-model="password" autocomplete="new-password" />
      </div>

      <label class="terms">
        <input type="checkbox" v-model="acceptedTerms" />
        <span>
          I agree to the
          <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
        </span>
      </label>

      <p v-if="errorMsg" class="err">{{ errorMsg }}</p>

      <button type="submit" class="t-btn primary full" :disabled="!acceptedTerms || loading">
        {{ loading ? 'Creating…' : 'Create Account' }} <span class="arrow">→</span>
      </button>

      <div class="auth-foot">
        Already have an account?
        <RouterLink :to="signInTarget">Sign in</RouterLink>
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

/* Spec-sheet frame with corner brackets — provided by .spec-frame. */
.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 36px 40px;
  background: rgba(10, 18, 32, 0.75);
}

.auth-card .kicker { margin-bottom: 10px; }

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

/* Terms acceptance — keep the checkbox top-aligned with the first
   line of the wrapping legal text. */
.terms {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
  color: var(--text-mute);
  margin: 14px 0 18px;
  cursor: pointer;
}
.terms input { accent-color: var(--cyan); margin-top: 3px; }
.terms a { color: var(--cyan); font-weight: 600; }

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
