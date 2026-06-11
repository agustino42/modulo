import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { dashboardStats, loadDashboard } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboard()
    const checkAlerts = async () => {
      try {
        const [lowStock, alerts] = await Promise.all([
          window.electronAPI.db.stock.getLowStock(),
          window.electronAPI.db.stock.getAlerts(),
        ])
        const pendingAlerts = alerts.filter((a: any) => a.status === 'pending')
        if (lowStock.length > 0) {
          window.electronAPI.db.notify(
            'Stock Bajo',
            `${lowStock.length} recurso(s) con stock por debajo del mínimo`
          )
        }
        if (pendingAlerts.length > 0) {
          window.electronAPI.db.notify(
            'Alertas Pendientes',
            `${pendingAlerts.length} alerta(s) de reposición sin atender`
          )
        }
      } catch {}
    }
    checkAlerts()
  }, [loadDashboard])

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const { stats, activity, topUsed } = dashboardStats

  const statCards = [
    { label: 'Total Recursos', value: stats.totalResources, color: 'bg-blue-500', icon: '🔧' },
    { label: 'En Uso', value: stats.inUse, color: 'bg-yellow-500', icon: '👤' },
    { label: 'Incidencias Abiertas', value: stats.openIncidents, color: 'bg-red-500', icon: '⚠️' },
    { label: 'Alertas Pendientes', value: stats.pendingAlerts, color: 'bg-orange-500', icon: '📦' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recursos Más Usados</h2>
          {topUsed.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topUsed}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="resource_name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_checkouts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Sin datos aún</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full ${a.action === 'checkout' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-gray-700">
                  <strong>{a.user_name}</strong>{' '}
                  {a.action === 'checkout' ? 'tomó' : 'devolvió'}{' '}
                  <strong>{a.resource_name}</strong>
                </span>
                <span className="text-gray-400 ml-auto text-xs">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-gray-400 text-center py-4">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
