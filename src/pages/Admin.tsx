import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types'

export default function Admin() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' })
  const [passwordModal, setPasswordModal] = useState<{ user: User } | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const loadUsers = async () => {
    const [all, pending, inactive] = await Promise.all([
      window.electronAPI.db.users.getAll(),
      window.electronAPI.db.users.getPending(),
      window.electronAPI.db.users.getInactive(),
    ])
    setUsers(all)
    setPendingUsers(pending)
    setInactiveUsers(inactive)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleApprove = async (id: number) => {
    await window.electronAPI.db.users.approve(id)
    await loadUsers()
  }

  const handleReject = async (id: number) => {
    if (!confirm('¿Rechazar este usuario? No podrá iniciar sesión.')) return
    await window.electronAPI.db.users.reject(id)
    await loadUsers()
  }

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return
    await window.electronAPI.db.users.create(form)
    setShowCreate(false)
    setForm({ name: '', email: '', password: '', role: 'user' })
    await loadUsers()
  }

  const handleUpdateRole = async (id: number, role: string) => {
    if (!confirm(`¿Cambiar el rol de este usuario a "${role === 'admin' ? 'Administrador' : 'Usuario'}"?`)) return
    await window.electronAPI.db.users.update(id, { role })
    await loadUsers()
  }

  const handlePasswordChange = async () => {
    if (!passwordModal || !newPassword || newPassword.length < 4) return
    await window.electronAPI.db.users.update(passwordModal.user.id, { password: newPassword })
    setPasswordModal(null)
    setNewPassword('')
  }

  const handleDeleteUser = async (id: number) => {
    if (id === currentUser?.id) {
      alert('No puedes darte de baja a ti mismo')
      return
    }
    if (!confirm('¿Dar de baja este usuario? Podrás restaurarlo después.')) return
    const result = await window.electronAPI.db.users.delete(id)
    if (!result.success) {
      alert(result.error || 'No se pudo dar de baja al usuario')
    }
    await loadUsers()
  }

  const handleRestoreUser = async (id: number) => {
    if (!confirm('¿Restaurar este usuario? Podrá iniciar sesión nuevamente.')) return
    await window.electronAPI.db.users.restore(id)
    await loadUsers()
  }

  const handleBackup = async () => {
    const ok = await window.electronAPI.db.backup.exportDb()
    if (ok) alert('Copia de seguridad creada con éxito')
  }

  const handleRestore = async () => {
    if (!confirm('¿Restaurar base de datos? Se perderán los datos actuales. La app se cerrará automáticamente.')) return
    const ok = await window.electronAPI.db.backup.importDb()
    if (ok) {
      alert('Base de datos restaurada. La aplicación se cerrará.')
      window.close()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-500 mt-1">Gestión de usuarios del sistema</p>
        </div>
       {/**  <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Usuario
        </button>
        */}
      </div>

      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <h2 className="font-semibold text-amber-800">Solicitudes Pendientes ({pendingUsers.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-amber-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="px-4 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Usuarios del Sistema</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Creado</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.filter(u => u.status === 'active').map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setPasswordModal({ user: u }); setNewPassword('') }}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                    >
                      Contraseña
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    >
                      Dar de Baja
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inactiveUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <span className="text-lg">📂</span>
            <h2 className="font-semibold text-gray-700">Usuarios Inactivos ({inactiveUsers.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {inactiveUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400">Dado de baja el {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestoreUser(u.id)}
                  className="px-4 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
             <h2 className="text-lg font-semibold mb-4">Nuevo Usuario</h2>
            <div className="space-y-3">
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
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
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
        
        
      )}

      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Cambiar Contraseña</h2>
            <p className="text-sm text-gray-500 mb-4">Usuario: <strong>{passwordModal.user.name}</strong></p>
            <input
              type="password"
              placeholder="Nueva contraseña (mín. 4 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPasswordModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={newPassword.length < 4}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Base de Datos</h2>
        <div className="flex gap-3">
          <button onClick={handleBackup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            Exportar Backup
          </button>
          <button onClick={handleRestore} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
            Restaurar Backup
          </button>
        </div>
      </div>
    </div>
  )
}
