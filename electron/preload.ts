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
      register: (data: { name: string; email: string; password: string }) => ipcRenderer.invoke('db:users:register', data),
      getPending: () => ipcRenderer.invoke('db:users:getPending'),
      approve: (id: number) => ipcRenderer.invoke('db:users:approve', id),
      reject: (id: number) => ipcRenderer.invoke('db:users:reject', id),
      delete: (id: number) => ipcRenderer.invoke('db:users:delete', id),
      getInactive: () => ipcRenderer.invoke('db:users:getInactive'),
      restore: (id: number) => ipcRenderer.invoke('db:users:restore', id),
    },
    checkInOut: {
      checkout: (resourceId: number, userId: number, etrMinutes: number) =>
        ipcRenderer.invoke('db:checkinout:checkout', resourceId, userId, etrMinutes),
      checkin: (resourceId: number) => ipcRenderer.invoke('db:checkinout:checkin', resourceId),
      getLogs: (resourceId?: number) => ipcRenderer.invoke('db:checkinout:getLogs', resourceId),
    },
    incidents: {
      getAll: () => ipcRenderer.invoke('db:incidents:getAll'),
      getById: (id: number) => ipcRenderer.invoke('db:incidents:getById', id),
      create: (data: any) => ipcRenderer.invoke('db:incidents:create', data),
      update: (id: number, data: any) => ipcRenderer.invoke('db:incidents:update', id, data),
      updateStatus: (id: number, status: string) => ipcRenderer.invoke('db:incidents:updateStatus', id, status),
      delete: (id: number) => ipcRenderer.invoke('db:incidents:delete', id),
    },
    stock: {
      getAlerts: () => ipcRenderer.invoke('db:stock:getAlerts'),
      getAll: () => ipcRenderer.invoke('db:stock:getAll'),
      getByResourceId: (resourceId: number) => ipcRenderer.invoke('db:stock:getByResourceId', resourceId),
      updateStockConfig: (resourceId: number, data: any) => ipcRenderer.invoke('db:stock:updateStockConfig', resourceId, data),
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
    notify: (title: string, body: string) => ipcRenderer.invoke('db:notify', title, body),
    backup: {
      exportDb: () => ipcRenderer.invoke('db:backup'),
      importDb: () => ipcRenderer.invoke('db:restore'),
    },
    reports: {
      getUsageStats: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('db:reports:getUsageStats', dateFrom, dateTo),
      getAuditLogs: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('db:reports:getAuditLogs', dateFrom, dateTo),
      getHealthSummary: () => ipcRenderer.invoke('db:reports:getHealthSummary'),
      getDashboardStats: () => ipcRenderer.invoke('db:reports:getDashboardStats'),
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
