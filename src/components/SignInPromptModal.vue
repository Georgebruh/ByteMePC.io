<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Reused across cards and detail pages whenever a signed-out user
// triggers an action that requires auth (favourite, pin, view-private).
// The host owns the open state and emits — we just render the prompt
// and dispatch a router push that carries the current path back as
// ?redirect= so post-auth lands the user exactly where they were.
const props = defineProps<{
  open: boolean
  // One-line headline shown in big type (e.g. "Sign in to favourite").
  title?: string
  // Sub-line under the headline (e.g. "Save builds across sessions.").
  message?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const route = useRoute()

function close() { emit('close') }

function goSignIn() {
  emit('close')
  router.push(`/sign-in?redirect=${encodeURIComponent(route.fullPath)}`)
}

function goSignUp() {
  emit('close')
  router.push(`/sign-up?redirect=${encodeURIComponent(route.fullPath)}`)
}

function onKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape') close()
}

// Lock background scroll + bind Escape only while the modal is open.
watch(() => props.open, (open) => {
  if (open) {
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="close">
      <div class="modal spec-frame" role="dialog" aria-modal="true">
        <span class="corner"></span>
        <button class="x" type="button" aria-label="Close" @click="close">×</button>

        <span class="kicker">// access · required</span>
        <h2>{{ title ?? 'Sign in required' }}</h2>
        <p class="sub">{{ message ?? 'Create an account or sign in to continue.' }}</p>

        <div class="actions">
          <button type="button" class="t-btn primary full" @click="goSignIn">
            Sign In <span class="arrow">→</span>
          </button>
          <button type="button" class="t-btn full" @click="goSignUp">
            Create Account
          </button>
        </div>

        <button type="button" class="dismiss" @click="close">Not now</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(2, 5, 10, 0.78);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 24px;
  font-family: var(--mono);
}

.modal {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 30px 22px;
  background: rgba(10, 18, 32, 0.95);
}

.x {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-mute);
  font-size: 20px;
  cursor: pointer;
  font-family: var(--mono);
  line-height: 1;
}
.x:hover { color: var(--cyan); }

.kicker { margin-bottom: 10px; }

h2 {
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--text);
  margin-bottom: 6px;
}

.sub {
  font-size: 12px;
  color: var(--text-mute);
  margin-bottom: 22px;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dismiss {
  display: block;
  margin: 14px auto 0;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-low);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  cursor: pointer;
}
.dismiss:hover { color: var(--text-mute); }
</style>
