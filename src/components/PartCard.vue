<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { Part } from '../data/mock'
import { builds, php } from '../data/mock'

// Tile used in the parts catalog grid and the Pinned screen. Clicking
// the body opens the part detail; right-clicking opens a context menu
// with Pin / Build actions (replaces the old corner pin button).
const props = defineProps<{
  part: Part
  // When true (Pinned screen) we render a "Pinned X days ago" label
  // instead of the standard Details → button.
  showPinnedMeta?: boolean
  pinnedMeta?: string
}>()

const emit = defineEmits<{
  (e: 'toggle-pin', id: string): void
  (e: 'add-to-build', payload: { partId: string; buildId: string | null }): void
}>()

const router = useRouter()

// Mono part-class label used in the top-left of the hero panel.
const classTag = computed(() => {
  switch (props.part.category) {
    case 'cpu':         return 'CPU'
    case 'motherboard': return 'MB'
    case 'gpu':         return 'GPU'
    case 'ram':         return 'RAM'
    case 'psu':         return 'PSU'
  }
})

// ─── Context menu state ───────────────────────────────────
// Single floating panel that switches between two views.
type MenuView = 'main' | 'build'
const menuOpen = ref(false)
const menuView = ref<MenuView>('main')
const menuX = ref(0)
const menuY = ref(0)
const menuEl = ref<HTMLElement | null>(null)

// Menu dimensions used to clamp position inside the viewport.
const MENU_W = 200
const MENU_H_MAIN = 92
const MENU_H_BUILD = 240

function openMenu(ev: MouseEvent) {
  const h = menuView.value === 'build' ? MENU_H_BUILD : MENU_H_MAIN
  menuX.value = Math.min(ev.clientX, window.innerWidth - MENU_W - 8)
  menuY.value = Math.min(ev.clientY, window.innerHeight - h - 8)
  menuView.value = 'main'
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
}

function onPin() {
  emit('toggle-pin', props.part.id)
  closeMenu()
}

function onNewBuild() {
  emit('add-to-build', { partId: props.part.id, buildId: null })
  closeMenu()
  router.push('/builder')
}

function onExistingBuild(buildId: string) {
  emit('add-to-build', { partId: props.part.id, buildId })
  closeMenu()
  router.push(`/builds/${buildId}`)
}

// ─── Outside-click / escape / scroll dismissal ────────────
function onDocPointerDown(ev: PointerEvent) {
  if (!menuOpen.value) return
  const t = ev.target as Node | null
  if (menuEl.value && t && menuEl.value.contains(t)) return
  closeMenu()
}
function onKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeMenu()
}
function onScroll() { closeMenu() }

watch(menuOpen, (open) => {
  if (open) {
    window.addEventListener('pointerdown', onDocPointerDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', closeMenu)
  } else {
    window.removeEventListener('pointerdown', onDocPointerDown, true)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', closeMenu)
  }
})
onBeforeUnmount(closeMenu)
</script>

<template>
  <div
    class="part-card"
    :class="{ pinned: part.pinned }"
    @contextmenu.prevent="openMenu"
  >
    <!-- Grid-paper hero panel. Class label in mono top-left, part icon
         centred. Pin button removed — pin lives in the right-click menu. -->
    <RouterLink :to="`/parts/${part.id}`" class="part-img grid-paper">
      <span class="cls">// {{ classTag }}</span>
      {{ part.icon ?? '🖥' }}
    </RouterLink>

    <span class="brand-mono">{{ part.brand }}</span>
    <h4>{{ part.name }}</h4>
    <div class="part-spec">{{ part.spec }}</div>

    <div class="part-foot">
      <span class="price-amber">{{ php(part.price) }}</span>
      <span v-if="showPinnedMeta" class="meta-pinned">// {{ pinnedMeta }}</span>
      <RouterLink v-else :to="`/parts/${part.id}`" class="t-btn small">Details →</RouterLink>
    </div>

    <!-- ─── Right-click context menu (teleport keeps it above any
         transformed/overflow-hidden ancestor in the catalog grid). ─── -->
    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menuEl"
        class="ctx-menu"
        :style="{ left: menuX + 'px', top: menuY + 'px' }"
        role="menu"
        @contextmenu.prevent
      >
        <!-- Main view ─── Pin / Build → -->
        <template v-if="menuView === 'main'">
          <div class="ctx-head">// {{ part.brand }} · {{ classTag }}</div>
          <button class="ctx-item" type="button" role="menuitem" @click="onPin">
            <span class="ctx-glyph">{{ part.pinned ? '⊘' : '◉' }}</span>
            <span>{{ part.pinned ? 'Unpin' : 'Pin' }}</span>
          </button>
          <button
            class="ctx-item"
            type="button"
            role="menuitem"
            @click="menuView = 'build'"
          >
            <span class="ctx-glyph">⌥</span>
            <span>Build</span>
            <span class="ctx-chevron">→</span>
          </button>
        </template>

        <!-- Build submenu ─── New + list of existing builds -->
        <template v-else>
          <button class="ctx-back" type="button" @click="menuView = 'main'">
            ← Back
          </button>
          <button class="ctx-item primary" type="button" role="menuitem" @click="onNewBuild">
            <span class="ctx-glyph">+</span>
            <span>New build</span>
          </button>
          <div class="ctx-section">// add to existing</div>
          <div class="ctx-scroll">
            <button
              v-for="b in builds"
              :key="b.id"
              class="ctx-build"
              type="button"
              role="menuitem"
              @click="onExistingBuild(b.id)"
            >
              <span class="ctx-build-icon">{{ b.icon }}</span>
              <span class="ctx-build-name">{{ b.name }}</span>
            </button>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.part-card {
  position: relative;
  background: rgba(10, 18, 32, 0.6);
  border: 1px solid var(--line);
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: var(--mono);
}
.part-card:hover { border-color: var(--cyan); }

.part-img {
  position: relative;
  height: 120px;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin-bottom: 14px;
  color: var(--text-mute);
  text-decoration: none;
}
.part-img .cls {
  position: absolute;
  top: 6px;
  left: 8px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  text-transform: uppercase;
}

.brand-mono {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
  display: inline-block;
  margin-bottom: 6px;
}

h4 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  margin: 4px 0 6px;
  letter-spacing: -0.015em;
  line-height: 1.2;
}
.part-spec {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 12px;
  line-height: 1.5;
}

.part-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.price-amber {
  font-family: var(--display);
  font-weight: 700;
  font-size: 16px;
  color: var(--amber);
  letter-spacing: -0.02em;
}

.t-btn.small {
  padding: 6px 12px;
  font-size: 10px;
}

.meta-pinned {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.06em;
}

/* Pinned card — subtle purple hairline so the catalog still reads
   the pin state without the corner button. */
.part-card.pinned {
  border-color: rgba(168, 85, 247, 0.55);
  box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.08);
}
</style>

<!-- Context menu styles are global (un-scoped) so they apply through
     the <Teleport to="body"> portal. -->
<style>
.ctx-menu {
  position: fixed;
  z-index: 1000;
  width: 200px;
  background: rgba(5, 8, 16, 0.96);
  border: 1px solid var(--cyan);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(34, 211, 238, 0.18);
  font-family: var(--mono);
  color: var(--text);
  padding: 4px;
  user-select: none;
}
.ctx-head {
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--cyan);
  padding: 6px 8px 4px;
  text-transform: uppercase;
  border-bottom: 1px dashed var(--line);
  margin-bottom: 4px;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
}
.ctx-item:hover {
  background: rgba(34, 211, 238, 0.08);
  border-color: var(--line);
  color: var(--cyan);
}
.ctx-item.primary { color: var(--amber); }
.ctx-item.primary:hover {
  background: rgba(245, 158, 11, 0.08);
  color: var(--amber);
}
.ctx-glyph {
  width: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-mute);
}
.ctx-item:hover .ctx-glyph { color: inherit; }
.ctx-chevron {
  margin-left: auto;
  color: var(--text-mute);
  font-size: 11px;
}
.ctx-back {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-mute);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 4px 8px 6px;
  cursor: pointer;
  border-bottom: 1px dashed var(--line);
  margin-bottom: 4px;
  text-transform: uppercase;
}
.ctx-back:hover { color: var(--cyan); }
.ctx-section {
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--text-low);
  padding: 6px 10px 4px;
  text-transform: uppercase;
}
.ctx-scroll {
  max-height: 160px;
  overflow-y: auto;
}
.ctx-build {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  font-family: var(--mono);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
}
.ctx-build:hover {
  background: rgba(168, 85, 247, 0.08);
  border-color: var(--line);
  color: var(--purple);
}
.ctx-build-icon { font-size: 13px; }
.ctx-build-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Thin terminal-style scrollbar for the build list. */
.ctx-scroll::-webkit-scrollbar { width: 6px; }
.ctx-scroll::-webkit-scrollbar-thumb {
  background: rgba(34, 211, 238, 0.25);
}
</style>
