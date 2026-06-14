import { createRouter, createWebHistory } from 'vue-router'
import { requireAdmin } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/competitions' },

    // Public routes
    {
      path: '/competitions',
      name: 'Calendar',
      component: () => import('@/views/public/Calendar.vue'),
    },
    {
      path: '/competitions/:id',
      name: 'CompetitionDetail',
      component: () => import('@/views/public/CompetitionDetail.vue'),
    },
    {
      path: '/athletes/:license',
      name: 'AthleteProfile',
      component: () => import('@/views/public/AthleteProfile.vue'),
    },
    {
      path: '/search',
      redirect: '/competitions',
    },
    {
      path: '/rankings',
      name: 'Rankings',
      component: () => import('@/views/public/Rankings.vue'),
    },

    // Admin login (no guard)
    {
      path: '/admin/login',
      name: 'AdminLogin',
      component: () => import('@/views/admin/Login.vue'),
    },

    // Admin tree — guarded
    {
      path: '/admin',
      component: () => import('@/components/layout/AdminLayout.vue'),
      beforeEnter: requireAdmin,
      children: [
        {
          path: '',
          redirect: { name: 'AdminModeration' },
        },
        {
          path: 'moderation',
          name: 'AdminModeration',
          component: () => import('@/views/admin/Moderation.vue'),
        },
        {
          path: 'competitions',
          name: 'AdminCompetitionList',
          component: () => import('@/views/admin/CompetitionList.vue'),
        },
        // competitions/new must come before competitions/:id to avoid matching 'new' as an id
        {
          path: 'competitions/new',
          name: 'AdminCompetitionCreate',
          component: () => import('@/views/admin/CompetitionForm.vue'),
        },
        {
          path: 'competitions/:id',
          name: 'AdminCompetitionForm',
          component: () => import('@/views/admin/CompetitionForm.vue'),
        },
        {
          path: 'disciplines',
          name: 'AdminDisciplineManager',
          component: () => import('@/views/admin/DisciplineManager.vue'),
        },
        {
          path: 'athletes',
          name: 'AdminAthleteManager',
          component: () => import('@/views/admin/AthleteManager.vue'),
        },
      ],
    },

    // Catch-all
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/public/NotFound.vue'),
    },
  ],
})

export default router
