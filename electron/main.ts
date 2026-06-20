import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase, closeDatabase, saveDatabase, getDbPath } from './database/connection'
import { runMigrations } from './database/migrate'
import * as userRepo from './database/repositories/userRepo'
import * as resourceRepo from './database/repositories/resourceRepo'
import * as checkInOutRepo from './database/repositories/checkInOutRepo'
import * as incidentRepo from './database/repositories/incidentRepo'
import * as stockRepo from './database/repositories/stockRepo'
import * as reportRepo from './database/repositories/reportRepo'

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Módulo de Gestión',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  // Users
  ipcMain.handle('db:users:authenticate', (_e, email: string, password: string) => {
    return userRepo.authenticateUser(email, password)
  })
  ipcMain.handle('db:users:getAll', () => userRepo.getAllUsers())
  ipcMain.handle('db:users:create', (_e, data) => {
    return userRepo.createUser(data.name, data.email, data.password, data.role)
  })
  ipcMain.handle('db:users:update', (_e, id: number, data) => {
    userRepo.updateUser(id, data)
    return true
  })
  ipcMain.handle('db:users:register', (_e, data: { name: string; email: string; password: string }) => {
    const user = userRepo.registerUser(data.name, data.email, data.password)
    if (Notification.isSupported()) {
      new Notification({
        title: 'Nuevo registro de usuario',
        body: `${data.name} (${data.email}) se ha registrado. Revisa las solicitudes pendientes.`,
      }).show()
    }
    return user
  })
  ipcMain.handle('db:users:getPending', () => userRepo.getPendingUsers())
  ipcMain.handle('db:users:approve', (_e, id: number) => {
    userRepo.approveUser(id)
    return true
  })
  ipcMain.handle('db:users:reject', (_e, id: number) => {
    userRepo.rejectUser(id)
    return true
  })
  ipcMain.handle('db:users:delete', (_e, id: number) => {
    return userRepo.deleteUser(id)
  })
  ipcMain.handle('db:users:getInactive', () => userRepo.getInactiveUsers())
  ipcMain.handle('db:users:restore', (_e, id: number) => {
    userRepo.restoreUser(id)
    return true
  })

  // Resources
  ipcMain.handle('db:resources:getAll', () => resourceRepo.getAllResources())
  ipcMain.handle('db:resources:getById', (_e, id: number) => resourceRepo.getResourceById(id))
  ipcMain.handle('db:resources:create', (_e, data) => resourceRepo.createResource(data))
  ipcMain.handle('db:resources:update', (_e, id: number, data) => {
    resourceRepo.updateResource(id, data)
    return true
  })
  ipcMain.handle('db:resources:delete', (_e, id: number) => {
    resourceRepo.deleteResource(id)
    return true
  })

  // Check-in/Check-out
  ipcMain.handle('db:checkinout:checkout', (_e, resourceId: number, userId: number, etrMinutes: number) => {
    return checkInOutRepo.checkout(resourceId, userId, etrMinutes)
  })
  ipcMain.handle('db:checkinout:checkin', (_e, resourceId: number) => {
    return checkInOutRepo.checkin(resourceId)
  })
  ipcMain.handle('db:checkinout:getLogs', (_e, resourceId?: number) => {
    return checkInOutRepo.getCheckInOutLogs(resourceId)
  })

  // Incidents
  ipcMain.handle('db:incidents:getAll', () => incidentRepo.getAllIncidents())
  ipcMain.handle('db:incidents:getById', (_e, id: number) => incidentRepo.getIncidentById(id))
  ipcMain.handle('db:incidents:create', (_e, data) => {
    return incidentRepo.createIncident(data.resource_id, data.reported_by, data.description, data.severity)
  })
  ipcMain.handle('db:incidents:update', (_e, id: number, data) => {
    incidentRepo.updateIncident(id, data.description, data.severity)
    return true
  })
  ipcMain.handle('db:incidents:updateStatus', (_e, id: number, status: string) => {
    incidentRepo.updateIncidentStatus(id, status)
    return true
  })
  ipcMain.handle('db:incidents:delete', (_e, id: number) => {
    incidentRepo.deleteIncident(id)
    return true
  })

  // Stock
  ipcMain.handle('db:stock:getAlerts', () => stockRepo.getStockAlerts())
  ipcMain.handle('db:stock:createAlert', (_e, data) => {
    return stockRepo.createAlert(data.resource_id, data.requested_by, data.notes)
  })
  ipcMain.handle('db:stock:updateAlertStatus', (_e, id: number, status: string, approvedBy: number) => {
    stockRepo.updateAlertStatus(id, status, approvedBy)
    return true
  })
  ipcMain.handle('db:stock:updateStock', (_e, resourceId: number, quantity: number) => {
    stockRepo.updateStock(resourceId, quantity)
    return true
  })
  ipcMain.handle('db:stock:getAll', () => stockRepo.getAllStock())
  ipcMain.handle('db:stock:getByResourceId', (_e, resourceId: number) => stockRepo.getStockByResourceId(resourceId))
  ipcMain.handle('db:stock:updateStockConfig', (_e, resourceId: number, data: { min_threshold?: number; unit?: string }) => {
    stockRepo.updateStockConfig(resourceId, data)
    return true
  })
  ipcMain.handle('db:stock:getLowStock', () => stockRepo.getLowStockResources())
  ipcMain.handle('db:stock:registerMovement', (_e, data) => {
    return stockRepo.registerMovement(data.resource_id, data.quantity_change, data.type, data.notes, data.user_id)
  })
  ipcMain.handle('db:stock:getMovements', (_e, resourceId?: number) => stockRepo.getStockMovements(resourceId))
  ipcMain.handle('db:stock:getRestockCounts', () => stockRepo.getRestockCounts())

  // Notifications
  ipcMain.handle('db:notify', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return true
  })

  // Database backup / restore
  ipcMain.handle('db:backup', async () => {
    const { filePath: dest } = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `modulo-gestion-backup-${Date.now()}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (!dest) return false
    saveDatabase()
    fs.copyFileSync(getDbPath(), dest)
    return true
  })
  ipcMain.handle('db:restore', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (!filePaths?.length) return false
    const src = filePaths[0]
    const dbDir = path.dirname(getDbPath())
    const backupPath = path.join(dbDir, `modulo-gestion.db.restore-${Date.now()}`)
    fs.copyFileSync(getDbPath(), backupPath)
    fs.copyFileSync(src, getDbPath())
    return true
  })

  // Reports
  ipcMain.handle('db:reports:getUsageStats', (_e, dateFrom?: string, dateTo?: string) => reportRepo.getUsageStats(dateFrom, dateTo))
  ipcMain.handle('db:reports:getAuditLogs', (_e, dateFrom?: string, dateTo?: string) => reportRepo.getAuditLogs(dateFrom, dateTo))
  ipcMain.handle('db:reports:getHealthSummary', () => reportRepo.getHealthSummary())
  ipcMain.handle('db:reports:getDashboardStats', () => reportRepo.getDashboardStats())
}

app.whenReady().then(async () => {
  await initDatabase()
  runMigrations()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})
