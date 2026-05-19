import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import type { Resource, CheckInOutLog } from '../types'

export default function CheckInOut() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { resources, loadResources, pushScanChar, resetScanBuffer } = useAppStore()
  const { user } = useAuthStore()

  const preselectedId = searchParams.get('resourceId')
  const [selectedId, setSelectedId] = useState<number | null>(
    preselectedId ? Number(preselectedId) : null,
  )
  const [etr, setEtr] = useState(30)
  const [customEtr, setCustomEtr] = useState('')
  const [useCustomEtr, setUseCustomEtr] = useState(false)
  const [logs, setLogs] = useState<CheckInOutLog[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedResource = resources.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    loadResources()
  }, [loadResources])

  useEffect(() => {
    if (selectedId) {
      loadLogs(selectedId)
    }
  }, [selectedId])

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const resource = e.detail as Resource
      setSelectedId(resource.id)
    }
    window.addEventListener('scan-result', handler as EventListener)
    return () => {
      window.removeEventListener('scan-result', handler as EventListener)
      resetScanBuffer()
    }
  }, [resetScanBuffer])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key.length === 1) pushScanChar(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pushScanChar])

  const loadLogs = async (id: number) => {
    const result = await window.electronAPI.db.checkInOut.getLogs(id)
    setLogs(result)
  }

  const handleCheckout = async () => {
    if (!selectedResource || !user) return
    const etrMinutes = useCustomEtr ? Number(customEtr) : etr
    if (etrMinutes <= 0) {
      setMessage({ type: 'error', text: 'Debes definir un tiempo estimado de retorno' })
      return
    }

    const success = await window.electronAPI.db.checkInOut.checkout(
      selectedResource.id,
      user.id,
      etrMinutes,
    )

    if (success) {
      setMessage({ type: 'success', text: `Recurso tomado con éxito. ETR: ${etrMinutes} min` })
      await loadResources()
      await loadLogs(selectedResource.id)
    } else {
      setMessage({ type: 'error', text: 'No se pudo tomar el recurso. Quizás ya está en uso.' })
    }
  }

  const handleCheckin = async () => {
    if (!selectedResource) return
    const success = await window.electronAPI.db.checkInOut.checkin(selectedResource.id)

    if (success) {
      setMessage({ type: 'success', text: 'Recurso devuelto con éxito' })
      await loadResources()
      await loadLogs(selectedResource.id)
    } else {
      setMessage({ type: 'error', text: 'No se pudo devolver el recurso.' })
    }
  }

  const isInUse = selectedResource?.current_user_id !== null
  const isCurrentUser = selectedResource?.current_user_id === user?.id

  const etrOptions = [15, 30, 60, 120, 240, 480]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check-in / Check-out</h1>
        <p className="text-gray-500 mt-1">Escanea un código QR o selecciona un recurso de la lista</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Seleccionar Recurso</h2>

            <div className="relative">
              <input
                type="text"
                placeholder="Escanea QR o busca..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                onChange={(e) => {
                  const val = e.target.value
                  const found = resources.find(
                    (r) => r.qr_code === val || r.name.toLowerCase().includes(val.toLowerCase()),
                  )
                  if (found) setSelectedId(found.id)
                }}
              />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto">
              {resources.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedId === r.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">{r.qr_code}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      r.current_user_id ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-400">{r.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="float-right font-bold"
              >
                ×
              </button>
            </div>
          )}

          {selectedResource ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedResource.name}</h2>
                    <p className="text-gray-500 mt-1">{selectedResource.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {selectedResource.category}
                      </span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {selectedResource.qr_code}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                    isInUse ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {isInUse ? 'En Uso' : 'Disponible'}
                  </span>
                </div>

                {!isInUse && (
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiempo Estimado de Retorno (ETR)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {etrOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setEtr(opt); setUseCustomEtr(false) }}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              !useCustomEtr && etr === opt
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {opt < 60 ? `${opt} min` : `${opt / 60} h`}
                          </button>
                        ))}
                        <button
                          onClick={() => setUseCustomEtr(true)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            useCustomEtr
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          Personalizado
                        </button>
                      </div>
                      {useCustomEtr && (
                        <div className="mt-2">
                          <input
                            type="number"
                            value={customEtr}
                            onChange={(e) => setCustomEtr(e.target.value)}
                            placeholder="Minutos"
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <span className="text-sm text-gray-500 ml-2">minutos</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      Tomar Recurso
                    </button>
                  </div>
                )}

                {isInUse && isCurrentUser && (
                  <div className="border-t border-gray-100 pt-4">
                    <button
                      onClick={handleCheckin}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      Devolver Recurso
                    </button>
                  </div>
                )}

                {isInUse && !isCurrentUser && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
                      Este recurso está en uso por otro usuario. No puedes tomarlo hasta que sea devuelto.
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Historial</h2>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          log.action === 'checkout' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <span>
                          <strong>{log.user_name}</strong>{' '}
                          {log.action === 'checkout' ? 'tomó' : 'devolvió'}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {log.etr_minutes > 0 && log.action === 'checkout' && (
                          <span className="mr-3">ETR: {log.etr_minutes} min</span>
                        )}
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-gray-400 text-center py-4">Sin historial</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p>Selecciona un recurso o escanea un código QR</p>
                <p className="text-sm mt-1">Usa un escáner USB o selecciona de la lista</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
