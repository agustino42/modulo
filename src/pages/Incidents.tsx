import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import type { Incident } from '../types'

export default function Incidents() {
  const { resources, loadResources } = useAppStore()
  const { user } = useAuthStore()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    resource_id: 0,
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
  })

  const loadIncidents = async () => {
    const data = await window.electronAPI.db.incidents.getAll()
    setIncidents(data)
  }

  useEffect(() => {
    loadIncidents()
    loadResources()
  }, [loadResources])

  const handleCreate = async () => {
    if (!form.resource_id || !form.description || !user) return
    await window.electronAPI.db.incidents.create({
      resource_id: form.resource_id,
      reported_by: user.id,
      description: form.description,
      severity: form.severity,
    })
    setShowCreate(false)
    setForm({ resource_id: 0, description: '', severity: 'low' })
    await loadIncidents()
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    await window.electronAPI.db.incidents.updateStatus(id, status)
    await loadIncidents()
  }

  const severityBadge = (s: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    }
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[s] || ''}`}>{s}</span>
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      open: 'bg-red-100 text-red-700',
      in_progress: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-500',
    }
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[s] || ''}`}>{labels[s] || s}</span>
  }

  const filteredByRole = user?.role === 'admin'
    ? incidents
    : incidents.filter((i) => i.status === 'open' || i.status === 'in_progress')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <p className="text-gray-500 mt-1">Reporte de fallas y estado de salud de los activos</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Reportar Incidencia
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recurso</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reportado por</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Severidad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredByRole.map((inc) => (
              <tr key={inc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{inc.resource_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{inc.description}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{inc.user_name}</td>
                <td className="px-4 py-3">{severityBadge(inc.severity)}</td>
                <td className="px-4 py-3">{statusBadge(inc.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(inc.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {user?.role === 'admin' && inc.status === 'open' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'in_progress')}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        En Progreso
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Resolver
                      </button>
                    </div>
                  )}
                  {user?.role === 'admin' && inc.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Resolver
                    </button>
                  )}
                  {user?.role === 'admin' && inc.status === 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'closed')}
                      className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredByRole.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No hay incidencias reportadas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Reportar Incidencia</h2>
            <div className="space-y-3">
              <select
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={0}>Selecciona un recurso</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.qr_code})</option>
                ))}
              </select>

              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe la falla o problema..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severidad</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, severity: s })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        form.severity === s
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                      }`}
                    >
                      {s === 'low' ? 'Baja' : s === 'medium' ? 'Media' : s === 'high' ? 'Alta' : 'Crítica'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.resource_id || !form.description}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
              >
                Reportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
