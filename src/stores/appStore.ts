import { create } from 'zustand'
import type { Resource, DashboardStats } from '../types'

interface AppState {
  resources: Resource[]
  dashboardStats: DashboardStats | null
  loading: boolean
  scanBuffer: string
  scanTimeout: ReturnType<typeof setTimeout> | null
  loadResources: () => Promise<void>
  loadDashboard: () => Promise<void>
  pushScanChar: (char: string) => void
  resetScanBuffer: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  resources: [],
  dashboardStats: null,
  loading: false,
  scanBuffer: '',
  scanTimeout: null,

  loadResources: async () => {
    set({ loading: true })
    try {
      const resources = await window.electronAPI.db.resources.getAll()
      set({ resources })
    } finally {
      set({ loading: false })
    }
  },

  loadDashboard: async () => {
    try {
      const dashboardStats = await window.electronAPI.db.reports.getDashboardStats()
      set({ dashboardStats })
    } catch {
      // ignore
    }
  },

  pushScanChar: (char: string) => {
    const { scanBuffer, scanTimeout } = get()
    const newBuffer = scanBuffer + char
    if (scanTimeout) clearTimeout(scanTimeout)

    const timeout = setTimeout(() => {
      const buffer = get().scanBuffer
      if (buffer.length > 0) {
        const resource = get().resources.find(
          (r) => r.qr_code === buffer || r.id.toString() === buffer,
        )
        if (resource) {
          window.dispatchEvent(new CustomEvent('scan-result', { detail: resource }))
        }
      }
      set({ scanBuffer: '' })
    }, 150)

    set({ scanBuffer: newBuffer, scanTimeout: timeout })
  },

  resetScanBuffer: () => {
    const { scanTimeout } = get()
    if (scanTimeout) clearTimeout(scanTimeout)
    set({ scanBuffer: '', scanTimeout: null })
  },
}))
