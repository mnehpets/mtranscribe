import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import CaptureView from '../views/CaptureView.vue'
import ExportView from '../views/ExportView.vue'
import SettingsView from '../views/SettingsView.vue'
import AuthCallback from '../views/AuthCallback.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/u',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'capture',
          component: CaptureView
        },
        {
          path: 'export',
          name: 'export',
          component: ExportView
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView
        }
      ]
    },
    {
      path: '/u/auth-callback',
      name: 'auth-callback',
      component: AuthCallback
    }
  ]
})

export default router
