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
    <form class="auth-card" @submit="onSubmit">
      <h2>Join Byte Me PC</h2>
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

      <button type="submit" class="btn-primary auth-btn" :disabled="!acceptedTerms">Create Account →</button>

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

/* Terms acceptance — keep the checkbox top-aligned with the first
   line of the wrapping legal text. */
.terms {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
  color: var(--text-mute);
  margin: 14px 0 4px;
  cursor: pointer;
}
.terms input { accent-color: var(--cyan); margin-top: 3px; }
.terms a { color: var(--cyan); font-weight: 700; }

.auth-btn { width: 100%; margin-top: 8px; }
.auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-foot {
  text-align: center;
  margin-top: 22px;
  font-size: 13px;
  color: var(--text-mute);
}
.auth-foot a { color: var(--cyan); font-weight: 700; }
</style>
