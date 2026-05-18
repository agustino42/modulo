import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'user'] },
  { to: '/resources', label: 'Recursos', icon: '🔧', roles: ['admin', 'user'] },
  { to: '/checkinout', label: 'Check-in/Out', icon: '📋', roles: ['admin', 'user'] },
  { to: '/stock', label: 'Stock Crítico', icon: '📦', roles: ['admin', 'user'] },
  { to: '/incidents', label: 'Incidencias', icon: '⚠️', roles: ['admin', 'user'] },
  { to: '/reports', label: 'Reportes', icon: '📈', roles: ['admin'] },
  { to: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Módulo Gestión</h1>
        <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-600 mt-1">
          {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems
          .filter((item) => item.roles.includes(user?.role ?? 'user'))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>🚪</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
