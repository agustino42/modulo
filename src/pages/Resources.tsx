import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import Pagination from '../components/ui/Pagination'
import type { Resource } from '../types'

const PAGE_SIZE = 25

export default function Resources() {
  const { resources, loadResources, pushScanChar, resetScanBuffer } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'available' | 'in_use'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    type: 'non-consumable' as 'consumable' | 'non-consumable',
    qr_code: '',
    health_status: 'excellent' as 'excellent' | 'needs_review' | 'out_of_service',
    initial_quantity: 0,
    min_threshold: 5,
    unit: 'unidades',
  })

  useEffect(() => {
    setLoading(true)
    loadResources().finally(() => setLoading(false))

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
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
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
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const openCreate = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', category: '', type: 'non-consumable', qr_code: '', health_status: 'excellent', initial_quantity: 0, min_threshold: 5, unit: 'unidades' })
    setShowModal(true)
  }
  useKeyboardShortcut('n', openCreate, [])

  const openEdit = async (r: Resource) => {
    setEditingId(r.id)
    const defaults = {
      name: r.name,
      description: r.description,
      category: r.category,
      type: r.type,
      qr_code: r.qr_code,
      health_status: r.health_status,
      initial_quantity: 0,
      min_threshold: 5,
      unit: 'unidades',
    }
    if (r.type === 'consumable') {
      const stock = await window.electronAPI.db.stock.getByResourceId(r.id)
      if (stock) {
        defaults.min_threshold = stock.min_threshold
        defaults.unit = stock.unit
      }
    }
    setFormData(defaults)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name) return
    try {
      if (editingId !== null) {
        await window.electronAPI.db.resources.update(editingId, formData)
        if (formData.type === 'consumable') {
          await window.electronAPI.db.stock.updateStockConfig(editingId, {
            min_threshold: formData.min_threshold,
            unit: formData.unit,
          })
        }
      } else {
        await window.electronAPI.db.resources.create(formData)
      }
      setShowModal(false)
      await loadResources()
    } catch {
      alert('Error al guardar recurso')
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
        {status === ' xxxxxxx  ' ? 'Excelente' : status === 'needs_review' ? 'Requiere Revisión' : 'Fuera de Servicio'}
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
            onClick={openCreate}
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
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Buscar por nombre, código QR o categoría..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as any); setPage(0) }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Todos</option>
          <option value="available">Disponibles</option>
          <option value="in_use">En uso</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
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
              {paginated.map((r) => (
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
                        <>
                          <button
                            onClick={() => openEdit(r)}
                            className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No se encontraron recursos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingId !== null ? 'Editar Recurso' : 'Nuevo Recurso'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                <input
                  placeholder="Nombre del recurso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <input
                  placeholder="Descripción del recurso"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                <input
                  placeholder="Ej: "
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Código QR</label>
                <input
                  placeholder="Código único del recurso"
                  value={formData.qr_code}
                  onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="non-consumable">No Consumible</option>
                  <option value="consumable">Consumible</option>
                </select>
              </div>
              {formData.type === 'consumable' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-blue-700 mb-2">📦 {editingId === null ? 'Stock Inicial' : 'Configuración de Stock'}</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 50"
                        value={formData.initial_quantity}
                        onChange={(e) => setFormData({ ...formData, initial_quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Umbral mínimo</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 10"
                        value={formData.min_threshold}
                        onChange={(e) => setFormData({ ...formData, min_threshold: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                      <input
                        placeholder="Ej: metros"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
              {editingId !== null && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado de Salud</label>
                  <select
                    value={formData.health_status}
                  onChange={(e) => setFormData({ ...formData, health_status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="excellent">Excelente</option>
                  <option value="needs_review">Requiere Revisión</option>
                  <option value="out_of_service">Fuera de Servicio</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {editingId !== null ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
