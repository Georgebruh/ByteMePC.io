<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '../../components/AppNav.vue'

// Same shape as SignInView — keeping a thin local state until Supabase
// sign-up is wired in. Reuses the .auth-card styling.
const username = ref('')
const email = ref('')
const password = ref('')
const acceptedTerms = ref(false)

const router = useRouter()

function onSubmit(e: Event) {
  e.preventDefault()
  if (!acceptedTerms.value) return
  router.push('/builds')
}
</script>

<template>
  <AppNav :show-avatar="false" :right-cta="{ label: 'Sign In', to: '/sign-in' }" />

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

      <button type="submit" class="t-btn primary full" :disabled="!acceptedTerms">
        Create Account <span class="arrow">→</span>
      </button>

      <div class="auth-foot">
        Already have an account?
        <RouterLink to="/sign-in">Sign in</RouterLink>
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
</style>
