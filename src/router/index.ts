import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// All routes for the ByteMePC app. Views are lazy-loaded so the initial
// JS bundle stays small — only the landing page ships on first load.
const routes: RouteRecordRaw[] = [
  { path: '/',            name: 'landing',   component: () => import('../views/LandingView.vue') },
  { path: '/sign-in',     name: 'sign-in',   component: () => import('../views/auth/SignInView.vue') },
  { path: '/sign-up',     name: 'sign-up',   component: () => import('../views/auth/SignUpView.vue') },

  // Parts catalog + detail
  { path: '/browse',          name: 'browse',      component: () => import('../views/parts/BrowseView.vue') },
  { path: '/parts/:id',       name: 'part-detail', component: () => import('../views/parts/PartDetailView.vue') },
  { path: '/pinned',          name: 'pinned',      component: () => import('../views/parts/PinnedView.vue') },

  // Builder flow
  { path: '/builder',         name: 'builder',        component: () => import('../views/builder/BuilderView.vue') },
  { path: '/builder/budget',  name: 'budget-builder', component: () => import('../views/builder/BudgetBuilderView.vue') },

  // Builds — owned + community
  { path: '/builds',          name: 'my-builds',    component: () => import('../views/builds/MyBuildsView.vue') },
  { path: '/builds/:id',      name: 'build-detail', component: () => import('../views/builds/BuildDetailView.vue') },
  { path: '/community',       name: 'feed',         component: () => import('../views/builds/PublicFeedView.vue') },
  { path: '/favourites',      name: 'favourites',   component: () => import('../views/builds/FavouritesView.vue') },

  // Account
  { path: '/profile',         name: 'profile',      component: () => import('../views/ProfileView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // Always scroll to top when navigating between screens. Without this,
  // jumping from a long screen (e.g. browse) to a short one keeps the
  // scroll halfway down the page.
  scrollBehavior: () => ({ top: 0 }),
})
