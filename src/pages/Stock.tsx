import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import type { ConsumableStock, LowStockItem, RestockAlert } from '../types'

export default function Stock() {
  const { loadResources } = useAppStore()
  const { user } = useAuthStore()

  const [stockItems, setStockItems] = useState<ConsumableStock[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [alerts, setAlerts] = useState<RestockAlert[]>([])
  const [tab, setTab] = useState<'all' | 'low' | 'alerts'>('all')
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertResourceId, setAlertResourceId] = useState<number | null>(null)
  const [alertNotes, setAlertNotes] = useState('')

  const loadData = async () => {
    const [allStock, low, allAlerts] = await Promise.all([
      window.electronAPI.db.stock.getAll(),
      window.electronAPI.db.stock.getLowStock(),
      window.electronAPI.db.stock.getAlerts(),
    ])
    setStockItems(allStock)
    setLowStock(low)
    setAlerts(allAlerts)
  }

  useEffect(() => {
    loadData()
    loadResources()
  }, [loadResources])

  const handleUpdateStock = async (resourceId: number, quantity: number) => {
    await window.electronAPI.db.stock.updateStock(resourceId, quantity)
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
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recurso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock Mínimo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockItems.map((item) => {
                const isLow = item.current_quantity <= item.min_threshold
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-900'}>
                        {item.current_quantity}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{item.min_threshold}</td>
                    <td className="px-4 py-3 text-right">
                      {isLow ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const newQty = prompt('Nueva cantidad:', String(item.current_quantity))
                            if (newQty !== null) handleUpdateStock(item.resource_id, Number(newQty))
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                          Ajustar
                        </button>
                        {isLow && user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setAlertResourceId(item.resource_id)
                              setShowAlertModal(true)
                            }}
                            className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                          >
                            Alertar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
