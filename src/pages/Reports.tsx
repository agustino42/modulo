import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { UsageStat, AuditLog, HealthSummary } from '../types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Reports() {
  const [usageStats, setUsageStats] = useState<UsageStat[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [healthSummary, setHealthSummary] = useState<HealthSummary[]>([])
  const [tab, setTab] = useState<'usage' | 'audit' | 'health'>('usage')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [usage, audit, health] = await Promise.all([
      window.electronAPI.db.reports.getUsageStats(),
      window.electronAPI.db.reports.getAuditLogs(),
      window.electronAPI.db.reports.getHealthSummary(),
    ])
    setUsageStats(usage)
    setAuditLogs(audit)
    setHealthSummary(health)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Auditoría</h1>
        <p className="text-gray-500 mt-1">Estadísticas de uso, logs y estado de salud</p>
      </div>

      <div className="flex gap-2">
        {(['usage', 'audit', 'health'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'usage' ? 'Uso de Recursos' : t === 'audit' ? 'Logs de Auditoría' : 'Salud de Activos'}
          </button>
        ))}
      </div>

      {tab === 'usage' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recursos Más Demandados</h2>
          {usageStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={usageStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="resource_name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_checkouts" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Veces usado" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Sin datos de uso aún</p>
          )}

          <div className="mt-8">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Detalle por Recurso</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Recurso</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Veces usado</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Total minutos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usageStats.map((stat, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{stat.resource_name}</td>
                    <td className="px-3 py-2 text-right font-mono">{stat.total_checkouts}</td>
                    <td className="px-3 py-2 text-right font-mono">{stat.total_minutes_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Registro Histórico de Actividad</h2>
            <p className="text-sm text-gray-500 mt-1">Últimas 500 interacciones</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recurso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">QR</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">ETR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{log.user_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.user_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {log.user_role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.action === 'checkout' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action === 'checkout' ? 'Tomó' : 'Devolvió'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{log.resource_name}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{log.qr_code}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">{log.etr_minutes} min</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin registros</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Salud General</h2>
            {healthSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={healthSummary}
                    dataKey="count"
                    nameKey="health_status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ health_status, count }) =>
                      `${health_status === 'excellent' ? 'Excelente' : health_status === 'needs_review' ? 'Requiere Revisión' : 'Fuera de Servicio'}: ${count}`
                    }
                  >
                    {healthSummary.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">Sin datos</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Salud</h2>
            <div className="space-y-3">
              {healthSummary.map((h) => (
                <div key={h.health_status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    {h.health_status === 'excellent' ? 'Excelente' :
                     h.health_status === 'needs_review' ? 'Requiere Revisión' : 'Fuera de Servicio'}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{h.count}</span>
                </div>
              ))}
              {healthSummary.length === 0 && (
                <p className="text-gray-400 text-center py-4">Sin datos</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
