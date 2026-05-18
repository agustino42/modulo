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
      getLowStock: () => Promise<any[]>
      createAlert: (data: any) => Promise<any>
      updateAlertStatus: (id: number, status: string, approvedBy: number) => Promise<boolean>
      updateStock: (resourceId: number, quantity: number) => Promise<boolean>
    }
    reports: {
      getUsageStats: () => Promise<any[]>
      getAuditLogs: () => Promise<any[]>
      getHealthSummary: () => Promise<any[]>
      getDashboardStats: () => Promise<any>
    }
  }
}

interface Window {
  electronAPI: ElectronAPI
}
