import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import type { Resource } from '../types'

export default function Resources() {
  const { resources, loadResources, pushScanChar, resetScanBuffer } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'in_use'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newResource, setNewResource] = useState({
    name: '',
    description: '',
    category: '',
    type: 'non-consumable' as 'consumable' | 'non-consumable',
    qr_code: '',
  })

  useEffect(() => {
    loadResources()

    const handler = (e: CustomEvent) => {
      const resource = e.detail as Resource
      navigate(`/checkinout?resourceId=${resource.id}`)
    }
    window.addEventListener('scan-result', handler as EventListener)
    return () => {
      window.removeEventListener('scan-result', handler as EventListener)
      resetScanBuffer()
    }
  }, [loadResources, navigate, resetScanBuffer])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') return
      if (e.key.length === 1) {
        pushScanChar(e.key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pushScanChar])

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.qr_code.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'available' && r.current_user_id === null) ||
      (filter === 'in_use' && r.current_user_id !== null)
    return matchesSearch && matchesFilter
  })

  const handleAdd = async () => {
    if (!newResource.name) return
    try {
      await window.electronAPI.db.resources.create({
        ...newResource,
        health_status: 'excellent',
      })
      setShowAdd(false)
      setNewResource({ name: '', description: '', category: '', type: 'non-consumable', qr_code: '' })
      await loadResources()
    } catch {
      alert('Error al crear recurso')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este recurso?')) return
    await window.electronAPI.db.resources.delete(id)
    await loadResources()
  }

  const statusBadge = (r: Resource) => {
    if (r.current_user_id) return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">En uso</span>
    return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Disponible</span>
  }

  const healthBadge = (status: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-100 text-green-700',
      needs_review: 'bg-yellow-100 text-yellow-700',
      out_of_service: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || ''}`}>
        {status === 'excellent' ? 'Excelente' : status === 'needs_review' ? 'Requiere Revisión' : 'Fuera de Servicio'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recursos</h1>
          <p className="text-gray-500 mt-1">Gestiona los activos y herramientas</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nuevo Recurso
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código QR o categoría..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Todos</option>
          <option value="available">Disponibles</option>
          <option value="in_use">En uso</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Código QR</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Salud</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-gray-600">{r.qr_code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    r.type === 'consumable' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {r.type === 'consumable' ? 'Consumible' : 'No Consumible'}
                  </span>
                </td>
                <td className="px-4 py-3">{statusBadge(r)}</td>
                <td className="px-4 py-3">{healthBadge(r.health_status)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {r.current_user_id === null && (
                      <button
                        onClick={() => navigate(`/checkinout?resourceId=${r.id}`)}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Tomar
                      </button>
                    )}
                    {r.current_user_id !== null && (
                      <button
                        onClick={() => navigate(`/checkinout?resourceId=${r.id}`)}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Devolver
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No se encontraron recursos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nuevo Recurso</h2>
            <div className="space-y-3">
              <input
                placeholder="Nombre"
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Descripción"
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Categoría"
                value={newResource.category}
                onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                placeholder="Código QR"
                value={newResource.qr_code}
                onChange={(e) => setNewResource({ ...newResource, qr_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                value={newResource.type}
                onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="non-consumable">No Consumible</option>
                <option value="consumable">Consumible</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
