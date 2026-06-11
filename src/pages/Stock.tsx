import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import type { ConsumableStock, LowStockItem, RestockAlert, RestockCount } from '../types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Stock() {
  const { loadResources } = useAppStore()
  const { user } = useAuthStore()

  const [stockItems, setStockItems] = useState<ConsumableStock[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [alerts, setAlerts] = useState<RestockAlert[]>([])
  const [restockCounts, setRestockCounts] = useState<RestockCount[]>([])
  const [tab, setTab] = useState<'all' | 'low' | 'alerts'>('all')
  const [searchStock, setSearchStock] = useState('')
  const [loadingStock, setLoadingStock] = useState(true)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertResourceId, setAlertResourceId] = useState<number | null>(null)
  const [alertNotes, setAlertNotes] = useState('')
  const [movementModal, setMovementModal] = useState<{
    item: ConsumableStock
    type: 'entry' | 'exit'
    quantity: string
    notes: string
  } | null>(null)
  const [movementError, setMovementError] = useState('')

  const loadData = async () => {
    const [allStock, low, allAlerts, counts] = await Promise.all([
      window.electronAPI.db.stock.getAll(),
      window.electronAPI.db.stock.getLowStock(),
      window.electronAPI.db.stock.getAlerts(),
      window.electronAPI.db.stock.getRestockCounts(),
    ])
    setStockItems(allStock)
    setLowStock(low)
    setAlerts(allAlerts)
    setRestockCounts(counts)
    if (low.length > 0) {
      window.electronAPI.db.notify('Stock Bajo', `${low.length} recurso(s) necesitan reposición`)
    }
  }

  useEffect(() => {
    setLoadingStock(true)
    Promise.all([loadData(), loadResources()]).finally(() => setLoadingStock(false))
  }, [loadResources])

  const handleRegisterMovement = async () => {
    if (!movementModal || !user) return
    const qty = Number(movementModal.quantity)
    if (!qty || qty <= 0) {
      setMovementError('La cantidad debe ser un número mayor a 0')
      return
    }
    if (movementModal.type === 'exit' && !confirm(`¿Registrar salida de ${qty} ${movementModal.item.unit} de "${movementModal.item.name}"?`)) return
    const success = await window.electronAPI.db.stock.registerMovement({
      resource_id: movementModal.item.resource_id,
      quantity_change: qty,
      type: movementModal.type,
      notes: movementModal.notes,
      user_id: user.id,
    })
    if (!success) {
      setMovementError(movementModal.type === 'exit'
        ? 'Stock insuficiente para registrar esta salida'
        : 'Error al registrar movimiento')
      return
    }
    setMovementModal(null)
    setMovementError('')
    await loadData()
  }

  const handleCreateAlert = async () => {
    if (!alertResourceId || !user) return
    await window.electronAPI.db.stock.createAlert({
      resource_id: alertResourceId,
      requested_by: user.id,
      notes: alertNotes,
    })
    setShowAlertModal(false)
    setAlertNotes('')
    setAlertResourceId(null)
    await loadData()
  }

  const handleUpdateAlert = async (id: number, status: string) => {
    if (!user) return
    await window.electronAPI.db.stock.updateAlertStatus(id, status, user.id)
    await loadData()
  }

  const alertStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_procurement: 'bg-blue-100 text-blue-700',
      fulfilled: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_procurement: 'En Compra',
      fulfilled: 'Surtido',
      cancelled: 'Cancelado',
    }
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || ''}`}>
        {labels[status] || status}
      </span>
    )
  }

  const topRequested = [...restockCounts].filter(r => r.count > 0).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Crítico</h1>
          <p className="text-gray-500 mt-1">Control de inventario y alertas de reposición</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'low', 'alerts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t === 'all' ? 'Todo el Stock' : t === 'low' ? 'Stock Bajo' : 'Alertas'}
            {t === 'low' && lowStock.length > 0 && (
              <span className="ml-2 bg-red-500 text-white px-1.5 py-0.5 text-xs rounded-full">
                {lowStock.length}
              </span>
            )}
            {t === 'alerts' && (
              <span className="ml-2 bg-orange-500 text-white px-1.5 py-0.5 text-xs rounded-full">
                {alerts.filter(a => a.status === 'pending' || a.status === 'in_procurement').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchStock}
              onChange={(e) => setSearchStock(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => {
                const rows = [['Recurso', 'Categoría', 'Stock', 'Mín.', 'Unidad']]
                stockItems.forEach(item => rows.push([item.name, item.category, String(item.current_quantity), String(item.min_threshold), item.unit]))
                const csv = rows.map(r => r.join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'stock.csv'; a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Exportar CSV
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingStock ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
            <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recurso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mín.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Solicitado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Creado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockItems.filter(item => {
                  if (!searchStock) return true
                  const q = searchStock.toLowerCase()
                  return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
                }).map((item) => {
                  const isLow = item.current_quantity <= item.min_threshold
                  const count = restockCounts.find(r => r.resource_id === item.resource_id)
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {isLow && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-900'}>
                          {item.current_quantity}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{item.min_threshold}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {count && count.count > 0 ? (
                          <span className="text-blue-600 font-semibold">{count.count}x</span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setMovementError('')
                              setMovementModal({
                                item, type: 'entry', quantity: '', notes: '',
                              })
                            }}
                            className="p-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="Entrada de stock"
                          >
                            +📦
                          </button>
                          <button
                            onClick={() => {
                              setMovementError('')
                              setMovementModal({
                                item, type: 'exit', quantity: '', notes: '',
                              })
                            }}
                            className="p-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                            title="Salida de stock"
                          >
                            -📦
                          </button>
                          {isLow && user?.role === 'admin' && (
                            <button
                              onClick={() => {
                                setAlertResourceId(item.resource_id)
                                setShowAlertModal(true)
                              }}
                              className="p-1.5 text-xs bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors"
                              title="Alertar reposición"
                            >
                              🔔
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </>
            )}
          </div>

          {topRequested.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                Recursos más solicitados
              </h2>
              <ResponsiveContainer width="100%" height={Math.max(150, topRequested.length * 50)}>
                <BarChart
                  data={topRequested}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="resource_name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Veces solicitado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === 'low' && (
        <div className="space-y-3">
          {lowStock.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-red-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">
                  Stock: <span className="font-bold text-red-600">{item.current_quantity}</span> / {item.min_threshold} {item.unit}
                </p>
              </div>
              <button
                onClick={() => {
                  setAlertResourceId(item.resource_id)
                  setShowAlertModal(true)
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
              >
                Solicitar Reposición
              </button>
            </div>
          ))}
          {lowStock.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              No hay recursos con stock bajo
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{alert.resource_name}</h3>
                  <p className="text-xs text-gray-500">
                    Solicitado por {alert.user_name} — {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                {alertStatusBadge(alert.status)}
              </div>
              {alert.notes && (
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">{alert.notes}</p>
              )}
              {alert.status === 'pending' && user?.role === 'admin' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleUpdateAlert(alert.id, 'in_procurement')}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    En Proceso de Compra
                  </button>
                  <button
                    onClick={() => handleUpdateAlert(alert.id, 'fulfilled')}
                    className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Marcar como Surtido
                  </button>
                  <button
                    onClick={() => handleUpdateAlert(alert.id, 'cancelled')}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {alert.status === 'in_procurement' && user?.role === 'admin' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleUpdateAlert(alert.id, 'fulfilled')}
                    className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Marcar como Surtido
                  </button>
                </div>
              )}
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              No hay alertas de reposición
            </div>
          )}
        </div>
      )}

      {movementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-1">
              {movementModal.type === 'entry' ? 'Entrada de Stock' : 'Salida de Stock'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Recurso: <strong>{movementModal.item.name}</strong> ({movementModal.item.current_quantity} {movementModal.item.unit} actuales)
            </p>
            {movementError && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">
                {movementError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 10"
                  value={movementModal.quantity}
                  onChange={(e) => setMovementModal({ ...movementModal, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nota (opcional)</label>
                <input
                  placeholder={movementModal.type === 'entry' ? 'Ej: Compra a proveedor' : 'Ej: Uso en proyecto X'}
                  value={movementModal.notes}
                  onChange={(e) => setMovementModal({ ...movementModal, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMovementModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={!movementModal.quantity || Number(movementModal.quantity) <= 0}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  movementModal.type === 'entry'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {movementModal.type === 'entry' ? 'Registrar Entrada' : 'Registrar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nueva Alerta de Reposición</h2>
            <textarea
              value={alertNotes}
              onChange={(e) => setAlertNotes(e.target.value)}
              placeholder="Notas (opcional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAlert}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Crear Alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}