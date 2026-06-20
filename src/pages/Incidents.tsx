import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import Pagination from '../components/ui/Pagination'
import type { Incident } from '../types'

const PAGE_SIZE = 25

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En Progreso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString()
}

export default function Incidents() {
  const { resources, loadResources } = useAppStore()
  const { user } = useAuthStore()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null)
  const [editIncident, setEditIncident] = useState<Incident | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: number; status: string; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [form, setForm] = useState({
    resource_id: 0,
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
  })
  const [editForm, setEditForm] = useState({ description: '', severity: 'low' as 'low' | 'medium' | 'high' | 'critical' })

  const loadIncidents = async () => {
    const data = await window.electronAPI.db.incidents.getAll()
    setIncidents(data)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadIncidents(), loadResources()]).finally(() => setLoading(false))
  }, [loadResources])

  useKeyboardShortcut('n', () => setShowCreate(true), [])

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
    setConfirmAction(null)
    setDetailIncident(null)
    await loadIncidents()
  }

  const handleUpdate = async () => {
    if (!editIncident || !editForm.description) return
    await window.electronAPI.db.incidents.update(editIncident.id, {
      description: editForm.description,
      severity: editForm.severity,
    })
    setEditIncident(null)
    setDetailIncident(null)
    await loadIncidents()
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.db.incidents.delete(id)
    setDetailIncident(null)
    await loadIncidents()
  }

  const openDetail = async (inc: Incident) => {
    const full = await window.electronAPI.db.incidents.getById(inc.id)
    setDetailIncident(full || inc)
  }

  const openEdit = (inc: Incident) => {
    setEditIncident(inc)
    setEditForm({ description: inc.description, severity: inc.severity })
  }

  const confirmStatusChange = (inc: Incident, newStatus: string) => {
    const labels: Record<string, string> = {
      in_progress: 'marcar como En Progreso',
      resolved: 'marcar como Resuelta',
      closed: 'marcar como Cerrada',
    }
    const extra = newStatus === 'resolved'
      ? ' Se actualizará la salud del recurso a Excelente.'
      : newStatus === 'closed'
        ? ' Se actualizará la salud del recurso a Requiere Revisión.'
        : ''
    setConfirmAction({
      id: inc.id,
      status: newStatus,
      message: `¿${labels[newStatus] || 'cambiar estado'} la incidencia "${inc.description.slice(0, 60)}"?${extra}`,
    })
  }

  const filteredByRole = user?.role === 'admin'
    ? incidents
    : incidents.filter((i) => i.status === 'open' || i.status === 'in_progress')

  const filtered = filteredByRole.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return i.resource_name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.user_name.toLowerCase().includes(q)
  })
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const statusCounts = {
    all: filteredByRole.length,
    open: filteredByRole.filter((i) => i.status === 'open').length,
    in_progress: filteredByRole.filter((i) => i.status === 'in_progress').length,
    resolved: filteredByRole.filter((i) => i.status === 'resolved').length,
    closed: filteredByRole.filter((i) => i.status === 'closed').length,
  }

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

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'open', label: 'Abiertas', color: 'bg-red-500' },
          { key: 'in_progress', label: 'En Progreso', color: 'bg-blue-500' },
          { key: 'resolved', label: 'Resueltas', color: 'bg-green-500' },
          { key: 'closed', label: 'Cerradas', color: 'bg-gray-400' },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
            </div>
          
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((key) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(0) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === key
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {key === 'all' ? 'Todas' : STATUS_LABELS[key]}
            {statusCounts[key as keyof typeof statusCounts] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                statusFilter === key ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {statusCounts[key as keyof typeof statusCounts]}
              </span>
            )}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        placeholder="Buscar por recurso, descripción o usuario..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recurso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reportado por</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openDetail(inc)}
                >
                  <td className="px-4 py-3">
                    <div className={`w-1.5 h-8 rounded-full ${SEVERITY_DOT[inc.severity] || 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{inc.resource_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{inc.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inc.user_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[inc.status] || ''}`}>
                      {STATUS_LABELS[inc.status] || inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    <span title={new Date(inc.created_at).toLocaleString()}>{timeAgo(inc.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {user?.role === 'admin' && inc.status === 'open' && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => confirmStatusChange(inc, 'in_progress')}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          En Progreso
                        </button>
                        <button
                          onClick={() => confirmStatusChange(inc, 'resolved')}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    )}
                    {user?.role === 'admin' && inc.status === 'in_progress' && (
                      <button
                        onClick={() => confirmStatusChange(inc, 'resolved')}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Resolver
                      </button>
                    )}
                    {user?.role === 'admin' && inc.status === 'resolved' && (
                      <button
                        onClick={() => confirmStatusChange(inc, 'closed')}
                        className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cerrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-3xl mb-2">🛠️</div>
                    <p className="text-gray-400">
                      {search || statusFilter !== 'all'
                        ? 'No se encontraron incidencias con esos filtros'
                        : 'No hay incidencias reportadas'}
                    </p>
                    {!search && statusFilter === 'all' && (
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Reportar la primera incidencia
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Reportar Incidencia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Recurso</label>
                <select
                  value={form.resource_id}
                  onChange={(e) => setForm({ ...form, resource_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={0}>Selecciona un recurso</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.qr_code})
                      {r.health_status === 'out_of_service' ? ' — Fuera de Servicio' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Descripción del problema</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { icon: '🔌', label: 'No enciende', text: 'El equipo no enciende al presionar el botón de encendido.' },
                    { icon: '🌡️', label: 'Sobrecalentamiento', text: 'El equipo se calienta demasiado después de unos minutos de uso.' },
                    { icon: '🪟', label: 'Daño físico', text: 'El equipo presenta daño físico visible en su estructura.' },
                    { icon: '⚙️', label: 'Mal funcionamiento', text: 'El equipo no realiza sus funciones de manera correcta.' },
                    { icon: '🔋', label: 'Batería', text: 'La batería no retiene carga o se descarga muy rápido.' },
                    { icon: '✏️', label: 'Otro', text: '' },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        setForm({ ...form, description: t.text })
                        if (t.text === '') {
                          setTimeout(() => {
                            const el = document.getElementById('incident-desc') as HTMLTextAreaElement
                            el?.focus()
                          }, 50)
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap ${
                        form.description === t.text && t.text !== ''
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="incident-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Escribe o selecciona una opción rápida arriba..."
                  rows={3}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Severidad</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, severity: s })}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        form.severity === s
                          ? s === 'low' ? 'border-gray-400 bg-gray-50 text-gray-700'
                            : s === 'medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                            : s === 'high' ? 'border-orange-400 bg-orange-50 text-orange-700'
                            : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">
                          {s === 'low' ? '🟢' : s === 'medium' ? '🟡' : s === 'high' ? '🟠' : '🔴'}
                        </span>
                        <span className="text-xs font-medium">{SEVERITY_LABELS[s]}</span>
                      </div>
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

      {detailIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Detalle de Incidencia</h2>
              <button
                onClick={() => { setDetailIncident(null); setEditIncident(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {editIncident ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Severidad</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditForm({ ...editForm, severity: s })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          editForm.severity === s
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                        }`}
                      >
                        {SEVERITY_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setEditIncident(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={!editForm.description}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Recurso</p>
                      <p className="font-medium text-gray-900">{detailIncident.resource_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Reportado por</p>
                      <p className="font-medium text-gray-900">{detailIncident.user_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Severidad</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full inline-block mt-0.5 ${SEVERITY_COLORS[detailIncident.severity] || ''}`}>
                        {SEVERITY_LABELS[detailIncident.severity] || detailIncident.severity}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Estado</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full inline-block mt-0.5 ${STATUS_COLORS[detailIncident.status] || ''}`}>
                        {STATUS_LABELS[detailIncident.status] || detailIncident.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Creada</p>
                      <p className="text-sm text-gray-700">{new Date(detailIncident.created_at).toLocaleString()}</p>
                    </div>
                    {detailIncident.resolved_at && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Resuelta</p>
                        <p className="text-sm text-gray-700">{new Date(detailIncident.resolved_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Descripción</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {detailIncident.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div className="flex gap-2">
                    {user?.role === 'admin' && detailIncident.status === 'open' && (
                      <button
                        onClick={() => openEdit(detailIncident)}
                        className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta incidencia? Esta acción no se puede deshacer.')) {
                            handleDelete(detailIncident.id)
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role === 'admin' && detailIncident.status === 'open' && (
                      <>
                        <button
                          onClick={() => confirmStatusChange(detailIncident, 'in_progress')}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          En Progreso
                        </button>
                        <button
                          onClick={() => confirmStatusChange(detailIncident, 'resolved')}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Resolver
                        </button>
                      </>
                    )}
                    {user?.role === 'admin' && detailIncident.status === 'in_progress' && (
                      <button
                        onClick={() => confirmStatusChange(detailIncident, 'resolved')}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Resolver
                      </button>
                    )}
                    {user?.role === 'admin' && detailIncident.status === 'resolved' && (
                      <button
                        onClick={() => confirmStatusChange(detailIncident, 'closed')}
                        className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Confirmar Cambio</h2>
            <p className="text-sm text-gray-600">{confirmAction.message}</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateStatus(confirmAction.id, confirmAction.status)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}