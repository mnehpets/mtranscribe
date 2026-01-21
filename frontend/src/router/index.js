import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import CaptureView from '../views/CaptureView.vue'
import ExportView from '../views/ExportView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
