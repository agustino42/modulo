/// <reference types="vite/client" />

interface ElectronAPI {
  db: {
    resources: {
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<boolean>
      delete: (id: number) => Promise<boolean>
    }
    users: {
      authenticate: (email: string, password: string) => Promise<any>
      getAll: () => Promise<any[]>
      create: (data: any) => Promise<any>
      update: (id: number, data: any) => Promise<boolean>
      register: (data: { name: string; email: string; password: string }) => Promise<any>
      getPending: () => Promise<any[]>
      approve: (id: number) => Promise<boolean>
      reject: (id: number) => Promise<boolean>
      delete: (id: number) => Promise<{ success: boolean; error?: string }>
      getInactive: () => Promise<any[]>
      restore: (id: number) => Promise<boolean>
    }
    checkInOut: {
      checkout: (resourceId: number, userId: number, etrMinutes: number) => Promise<boolean>
      checkin: (resourceId: number) => Promise<boolean>
      getLogs: (resourceId?: number) => Promise<any[]>
    }
    incidents: {
      getAll: () => Promise<any[]>
      create: (data: any) => Promise<any>
      updateStatus: (id: number, status: string) => Promise<boolean>
    }
    stock: {
      getAlerts: () => Promise<any[]>
      getAll: () => Promise<any[]>
      getByResourceId: (resourceId: number) => Promise<any>
      updateStockConfig: (resourceId: number, data: any) => Promise<boolean>
      getLowStock: () => Promise<any[]>
      createAlert: (data: any) => Promise<any>
      updateAlertStatus: (id: number, status: string, approvedBy: number) => Promise<boolean>
      updateStock: (resourceId: number, quantity: number) => Promise<boolean>
      registerMovement: (data: any) => Promise<boolean>
      getMovements: (resourceId?: number) => Promise<any[]>
      getRestockCounts: () => Promise<any[]>
    }
    notify: (title: string, body: string) => Promise<boolean>
    backup: {
      exportDb: () => Promise<boolean>
      importDb: () => Promise<boolean>
    },
    reports: {
      getUsageStats: (dateFrom?: string, dateTo?: string) => Promise<any[]>
      getAuditLogs: (dateFrom?: string, dateTo?: string) => Promise<any[]>
      getHealthSummary: () => Promise<any[]>
      getDashboardStats: () => Promise<any>
    }
  }
}

interface Window {
  electronAPI: ElectronAPI
}
