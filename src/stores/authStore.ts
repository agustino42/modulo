import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,

  login: async (email: string, password: string) => {
    try {
      const user = await window.electronAPI.db.users.authenticate(email, password)
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
        })
        return true
      }
      return false
    } catch {
      return false
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, isAdmin: false })
  },
}))
