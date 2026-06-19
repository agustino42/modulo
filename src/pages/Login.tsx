import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../context/ThemeContext'

const DEMO_CREDENTIALS = [
  { label: 'Admin', email: 'admin@modulo.com', password: 'admin123', role: 'admin' },
  { label: 'User', email: 'user@modulo.com', password: 'user123', role: 'user' },
]

export default function Login() {
  const [email, setEmail] = useState('admin@modulo.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error || 'Credenciales inválidas')
    }
  }

  const quickLogin = (creds: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(creds.email)
    setPassword(creds.password)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Módulo de Gestión</span>
        </div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          {theme === 'light' ? '🌙 Oscuro' : '☀️ Claro'}
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex w-full max-w-5xl min-h-[500px] rounded-2xl overflow-hidden" style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          border: '1px solid var(--border-color)',
        }}>
          <div className="hidden lg:flex flex-col justify-between w-3/5 p-12" style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
          }}>
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold text-white">Módulo de Gestión</h1>
                <p className="text-blue-200 mt-2 text-lg">Control inteligente de activos y recursos</p>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Plataforma integrada para la gestión de check-in/check-out,
                control de inventario, reporte de incidencias y generación
                de reportes empresariales.
              </p>
              <div className="space-y-3 pt-4">
                {[
                  { icon: '✅', label: 'Check-in / Check-out de recursos' },
                  { icon: '📦', label: 'Control de stock y alertas de reposición' },
                  { icon: '⚠️', label: 'Gestión de incidencias y mantenimiento' },
                  { icon: '📊', label: 'Reportes, auditoría y exportación de datos' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3 text-gray-200">
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-400 animate-fadeIn">
              <p>Versión 1.0.0 · Adcesa Edition</p>
            </div>
          </div>

          <div className="w-full lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center animate-slideUp">
            <div className="max-w-sm mx-auto w-full">
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Iniciar Sesión</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Ingresa tus credenciales para acceder</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Correo electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>✉️</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        backgroundColor: 'var(--bg-page)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        backgroundColor: 'var(--bg-page)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg font-medium text-sm transition-all"
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8' }}
                  onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb' }}
                >
                  {loading ? 'Ingresando...' : 'Acceder'}
                </button>
              </form>

              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Acceso rápido</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
                </div>
                <div className="flex gap-2">
                  {DEMO_CREDENTIALS.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => quickLogin(c)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: 'var(--bg-page)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = c.role === 'admin' ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-page)'}
                    >
                      <span>{c.role === 'admin' ? '👤' : '👤'}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--text-secondary)' }}>
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="text-blue-600 hover:underline font-medium">
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
        © {new Date().getFullYear()} Módulo de Gestión · Adcesa Edition · v1.0.0
      </footer>
    </div>
  )
}