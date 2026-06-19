import { create } from 'zustand'
import type { User } from '../types'

type LoginResult = { success: true } | { success: false; error: string }

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,

  login: async (email: string, password: string) => {
    try {
      const user = await window.electronAPI.db.users.authenticate(email, password)
      if (!user) return { success: false as const, error: 'Credenciales inválidas' }
      if (user.status === 'pending') return { success: false as const, error: 'Tu cuenta está pendiente de aprobación por un administrador' }
      if (user.status === 'rejected') return { success: false as const, error: 'Tu cuenta ha sido rechazada. Contacta al administrador.' }
      set({
        user,
        isAuthenticated: true,
        isAdmin: user.role === 'admin',
      })
      return { success: true as const }
    } catch {
      return { success: false as const, error: 'Error de conexión' }
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, isAdmin: false })
  },
}))
