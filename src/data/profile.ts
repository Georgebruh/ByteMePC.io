// Profile queries — the screen at /profile composes these to replace
// the old hard-coded "George Senagan / 12 builds / 28 favs" mock data
// with the actual signed-in user's row + live counts.
//
// Pin counts live across eight per-category tables in the schema, so
// the "PINS" KPI is the sum of eight parallel HEAD count queries — no
// SQL view abstraction yet, but the round-trip cost is bounded and
// easy to swap for a view if it ever matters.

import { supabase } from '../lib/supabase'

export interface ProfileRow {
  user_id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface ProfileStats {
  builds: number
  publicBuilds: number
  favourites: number
  pins: number
  views: number
}

export type ActivityKind = 'PUBLISHED' | 'CREATED' | 'FAVOURITED'

export interface ProfileActivity {
  kind: ActivityKind
  name: string
  sub: string
  // ISO timestamp — formatted to "2m ago" / "Yesterday" at render time.
  at: string
  // Build id is carried through so each row can deep-link to the
  // detail page.
  buildId: string
}

// Eight per-category pin tables — central list so the count query and
// any future "all pins" feed both stay in sync if a new category lands.
const PIN_TABLES = [
  'pinned_cpus',
  'pinned_gpus',
  'pinned_motherboards',
  'pinned_rams',
  'pinned_psus',
  'pinned_storages',
  'pinned_cases',
  'pinned_coolers',
] as const

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as ProfileRow | null
}

// Currently only username is editable from the Profile screen — the
// avatar_url field is reserved for the upload flow that's not wired
// up yet. RLS enforces owner-only updates.
export async function updateProfile(
  userId: string,
  patch: { username?: string; avatar_url?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [buildsRes, publicRes, favsRes, viewsRes, ...pinResults] = await Promise.all([
    supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_public', true),
    supabase
      .from('favorite_builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('builds')
      .select('views')
      .eq('user_id', userId),
    ...PIN_TABLES.map(t =>
      supabase.from(t).select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ),
  ])

  const views = ((viewsRes.data ?? []) as Array<{ views: number | null }>).reduce(
    (sum, r) => sum + (r.views ?? 0),
    0,
  )

  return {
    builds: buildsRes.count ?? 0,
    publicBuilds: publicRes.count ?? 0,
    favourites: favsRes.count ?? 0,
    pins: pinResults.reduce((sum, r) => sum + (r.count ?? 0), 0),
    views,
  }
}

// Most-recent builds (CREATED / PUBLISHED) + most-recent favourites,
// merged and sorted by timestamp desc. Pins are not included yet —
// they'd need an eight-table union and the UI doesn't show them
// individually on the activity feed anyway.
export async function fetchProfileActivity(
  userId: string,
  limit = 6,
): Promise<ProfileActivity[]> {
  const [buildsRes, favsRes] = await Promise.all([
    supabase
      .from('builds')
      .select('build_id, name, is_public, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('favorite_builds')
      .select('favorited_at, build:build_id ( build_id, name, profile:user_id ( username ) )')
      .eq('user_id', userId)
      .order('favorited_at', { ascending: false })
      .limit(limit),
  ])

  if (buildsRes.error) throw buildsRes.error
  if (favsRes.error) throw favsRes.error

  const out: ProfileActivity[] = []

  for (const b of (buildsRes.data ?? []) as Array<{
    build_id: string; name: string; is_public: boolean; updated_at: string
  }>) {
    out.push({
      kind: b.is_public ? 'PUBLISHED' : 'CREATED',
      name: b.name,
      sub: b.is_public ? 'Made public' : 'Draft build',
      at: b.updated_at,
      buildId: b.build_id,
    })
  }

  // supabase-js types nested joins as arrays even when the foreign-key
  // relationship is single-row, so coerce through `unknown` and treat
  // the joined fields as the singular row we actually get back.
  for (const f of (favsRes.data ?? []) as unknown as Array<{
    favorited_at: string
    build: { build_id: string; name: string; profile: { username: string } | null } | null
  }>) {
    if (!f.build) continue
    out.push({
      kind: 'FAVOURITED',
      name: f.build.name,
      sub: f.build.profile?.username ? `by @${f.build.profile.username}` : 'by @anonymous',
      at: f.favorited_at,
      buildId: f.build.build_id,
    })
  }

  return out
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, limit)
}
