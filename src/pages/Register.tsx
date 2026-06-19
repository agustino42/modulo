import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Completa todos los campos')
      return
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await window.electronAPI.db.users.register({ name: name.trim(), email: email.trim(), password })
      setSuccess(true)
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE')) {
        setError('El correo electrónico ya está registrado')
      } else {
        setError('Error al registrar. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
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
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8" style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-color)',
          }}>
            {success ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Registro exitoso</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Tu solicitud ha sido enviada. Un administrador revisará y aprobará tu cuenta.
                  Recibirás una notificación cuando esté activa.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-6 py-2.5 rounded-lg font-medium text-sm"
                  style={{ backgroundColor: '#2563eb', color: 'white' }}
                >
                  Volver a Iniciar Sesión
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Crear Cuenta</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Regístrate para solicitar acceso al sistema
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Nombre completo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>👤</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                          backgroundColor: 'var(--bg-page)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                  </div>

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
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                          backgroundColor: 'var(--bg-page)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Mínimo 4 caracteres"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirmar contraseña</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>🔒</span>
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                          backgroundColor: 'var(--bg-page)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Repite la contraseña"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
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
                    {loading ? 'Registrando...' : 'Registrarse'}
                  </button>
                </form>

                <p className="text-xs text-center mt-6" style={{ color: 'var(--text-secondary)' }}>
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="text-blue-600 hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
        © {new Date().getFullYear()} Módulo de Gestión · Adcesa Edition · v1.0.0
      </footer>
    </div>
  )
}