import { contextBridge, ipcRenderer } from 'electron'

const api = {
  db: {
    resources: {
      getAll: () => ipcRenderer.invoke('db:resources:getAll'),
      getById: (id: number) => ipcRenderer.invoke('db:resources:getById', id),
      create: (data: any) => ipcRenderer.invoke('db:resources:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:resources:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('db:resources:delete', id),
    },
    users: {
      authenticate: (email: string, password: string) => ipcRenderer.invoke('db:users:authenticate', email, password),
      getAll: () => ipcRenderer.invoke('db:users:getAll'),
      create: (data: any) => ipcRenderer.invoke('db:users:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:users:update', id, data),
    },
    checkInOut: {
      checkout: (resourceId: number, userId: number, etrMinutes: number) =>
        ipcRenderer.invoke('db:checkinout:checkout', resourceId, userId, etrMinutes),
      checkin: (resourceId: number) => ipcRenderer.invoke('db:checkinout:checkin', resourceId),
      getLogs: (resourceId?: number) => ipcRenderer.invoke('db:checkinout:getLogs', resourceId),
    },
    incidents: {
      getAll: () => ipcRenderer.invoke('db:incidents:getAll'),
      create: (data: any) => ipcRenderer.invoke('db:incidents:create', data),
      updateStatus: (id: number, status: string) => ipcRenderer.invoke('db:incidents:updateStatus', id, status),
    },
    stock: {
      getAlerts: () => ipcRenderer.invoke('db:stock:getAlerts'),
      getAll: () => ipcRenderer.invoke('db:stock:getAll'),
      getLowStock: () => ipcRenderer.invoke('db:stock:getLowStock'),
      createAlert: (data: any) => ipcRenderer.invoke('db:stock:createAlert', data),
      updateAlertStatus: (id: number, status: string, approvedBy: number) =>
        ipcRenderer.invoke('db:stock:updateAlertStatus', id, status, approvedBy),
      updateStock: (resourceId: number, quantity: number) =>
        ipcRenderer.invoke('db:stock:updateStock', resourceId, quantity),
      registerMovement: (data: any) => ipcRenderer.invoke('db:stock:registerMovement', data),
      getMovements: (resourceId?: number) => ipcRenderer.invoke('db:stock:getMovements', resourceId),
      getRestockCounts: () => ipcRenderer.invoke('db:stock:getRestockCounts'),
    },
    reports: {
      getUsageStats: () => ipcRenderer.invoke('db:reports:getUsageStats'),
      getAuditLogs: () => ipcRenderer.invoke('db:reports:getAuditLogs'),
      getHealthSummary: () => ipcRenderer.invoke('db:reports:getHealthSummary'),
      getDashboardStats: () => ipcRenderer.invoke('db:reports:getDashboardStats'),
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
