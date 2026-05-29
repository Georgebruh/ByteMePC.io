// Reactive Supabase session. Imported by any view that needs to know
// whether the user is signed in or look up their user_id.
//
// Initialised once on app boot — the auth listener keeps the ref in
// sync as the user signs in / out across tabs.

import { ref, computed } from 'vue'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

const session = ref<Session | null>(null)
let initialised = false

export function useSession() {
  if (!initialised) {
    initialised = true
    supabase.auth.getSession().then(({ data }) => {
      session.value = data.session
    })
    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })
  }

  return {
    session,
    userId: computed(() => session.value?.user.id ?? null),
    isSignedIn: computed(() => session.value !== null),
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
