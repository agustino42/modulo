import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/connection'
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
  ipcMain.handle('db:incidents:create', (_e, data) => {
    return incidentRepo.createIncident(data.resource_id, data.reported_by, data.description, data.severity)
  })
  ipcMain.handle('db:incidents:updateStatus', (_e, id: number, status: string) => {
    incidentRepo.updateIncidentStatus(id, status)
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
  ipcMain.handle('db:stock:getLowStock', () => stockRepo.getLowStockResources())
  ipcMain.handle('db:stock:registerMovement', (_e, data) => {
    stockRepo.registerMovement(data.resource_id, data.quantity_change, data.type, data.notes, data.user_id)
    return true
  })
  ipcMain.handle('db:stock:getMovements', (_e, resourceId?: number) => stockRepo.getStockMovements(resourceId))
  ipcMain.handle('db:stock:getRestockCounts', () => stockRepo.getRestockCounts())

  // Reports
  ipcMain.handle('db:reports:getUsageStats', () => reportRepo.getUsageStats())
  ipcMain.handle('db:reports:getAuditLogs', () => reportRepo.getAuditLogs())
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
