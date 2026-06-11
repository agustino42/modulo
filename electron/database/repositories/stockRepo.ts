import { getDatabase, saveDatabase } from '../connection'

export interface ConsumableStockRow {
  id: number
  resource_id: number
  current_quantity: number
  min_threshold: number
  unit: string
  updated_at: string
}

export interface RestockAlertRow {
  id: number
  resource_id: number
  requested_by: number
  status: 'pending' | 'in_procurement' | 'fulfilled' | 'cancelled'
  approved_by: number | null
  notes: string
  created_at: string
}

export function getStockAlerts(): (RestockAlertRow & { user_name: string; resource_name: string })[] {
  const db = getDatabase()
  const result = db.exec(`
    SELECT a.id, a.resource_id, a.requested_by, a.status, a.approved_by, a.notes, a.created_at,
           u.name as user_name, r.name as resource_name
    FROM restock_alerts a
    LEFT JOIN users u ON u.id = a.requested_by
    LEFT JOIN resources r ON r.id = a.resource_id
    ORDER BY a.created_at DESC
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    requested_by: row[2] as number,
    status: row[3] as 'pending' | 'in_procurement' | 'fulfilled' | 'cancelled',
    approved_by: row[4] as number | null,
    notes: row[5] as string,
    created_at: row[6] as string,
    user_name: row[7] as string,
    resource_name: row[8] as string,
  }))
}

export function getLowStockResources(): (ConsumableStockRow & { name: string; qr_code: string })[] {
  const db = getDatabase()
  const result = db.exec(`
    SELECT s.id, s.resource_id, s.current_quantity, s.min_threshold, s.unit, s.updated_at,
           r.name, r.qr_code
    FROM consumable_stock s
    JOIN resources r ON r.id = s.resource_id
    WHERE s.current_quantity <= s.min_threshold
    ORDER BY (s.current_quantity * 1.0 / s.min_threshold) ASC
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    current_quantity: row[2] as number,
    min_threshold: row[3] as number,
    unit: row[4] as string,
    updated_at: row[5] as string,
    name: row[6] as string,
    qr_code: row[7] as string,
  }))
}

export interface StockMovementRow {
  id: number
  resource_id: number
  quantity_change: number
  type: 'entry' | 'exit'
  notes: string
  user_id: number
  created_at: string
}

export function getAllStock(): (ConsumableStockRow & { name: string; qr_code: string; category: string; created_at: string })[] {
  const db = getDatabase()
  const result = db.exec(`
    SELECT s.id, s.resource_id, s.current_quantity, s.min_threshold, s.unit, s.updated_at,
           r.name, r.qr_code, r.category, r.created_at
    FROM consumable_stock s
    JOIN resources r ON r.id = s.resource_id
    ORDER BY r.name
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    current_quantity: row[2] as number,
    min_threshold: row[3] as number,
    unit: row[4] as string,
    updated_at: row[5] as string,
    name: row[6] as string,
    qr_code: row[7] as string,
    category: row[8] as string,
    created_at: row[9] as string,
  }))
}

export function registerMovement(resourceId: number, quantityChange: number, type: 'entry' | 'exit', notes: string, userId: number): boolean {
  const db = getDatabase()
  if (quantityChange <= 0) return false
  if (type === 'exit') {
    const current = db.exec('SELECT current_quantity FROM consumable_stock WHERE resource_id = ?', [resourceId])
    const qty = current[0]?.values[0]?.[0] as number ?? 0
    if (qty < quantityChange) return false
  }
  db.run(
    'INSERT INTO stock_movements (resource_id, quantity_change, type, notes, user_id) VALUES (?, ?, ?, ?, ?)',
    [resourceId, quantityChange, type, notes, userId],
  )
  const sign = type === 'entry' ? 1 : -1
  db.run(
    'UPDATE consumable_stock SET current_quantity = current_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE resource_id = ?',
    [sign * quantityChange, resourceId],
  )
  saveDatabase()
  return true
}

export function getStockMovements(resourceId?: number): (StockMovementRow & { user_name: string; resource_name: string })[] {
  const db = getDatabase()
  let query = `
    SELECT m.id, m.resource_id, m.quantity_change, m.type, m.notes, m.user_id, m.created_at,
           u.name as user_name, r.name as resource_name
    FROM stock_movements m
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN resources r ON r.id = m.resource_id
  `
  const params: any[] = []
  if (resourceId !== undefined) {
    query += ' WHERE m.resource_id = ?'
    params.push(resourceId)
  }
  query += ' ORDER BY m.created_at DESC LIMIT 200'

  const result = db.exec(query, params)
  if (result.length === 0) return []
  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    quantity_change: row[2] as number,
    type: row[3] as 'entry' | 'exit',
    notes: row[4] as string,
    user_id: row[5] as number,
    created_at: row[6] as string,
    user_name: row[7] as string,
    resource_name: row[8] as string,
  }))
}

export function getRestockCounts(): { resource_id: number; resource_name: string; count: number }[] {
  const db = getDatabase()
  const result = db.exec(`
    SELECT r.id, r.name, COUNT(a.id) as count
    FROM resources r
    LEFT JOIN restock_alerts a ON a.resource_id = r.id
    WHERE r.type = 'consumable'
    GROUP BY r.id
    ORDER BY count DESC
  `)
  if (result.length === 0) return []
  return result[0].values.map((row) => ({
    resource_id: row[0] as number,
    resource_name: row[1] as string,
    count: row[2] as number,
  }))
}

export function getStockByResourceId(resourceId: number): (ConsumableStockRow & { name: string; qr_code: string; category: string; created_at: string }) | null {
  const db = getDatabase()
  const result = db.exec(`
    SELECT s.id, s.resource_id, s.current_quantity, s.min_threshold, s.unit, s.updated_at,
           r.name, r.qr_code, r.category, r.created_at
    FROM consumable_stock s
    JOIN resources r ON r.id = s.resource_id
    WHERE s.resource_id = ?
  `, [resourceId])
  if (!result[0]?.values?.length) return null
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    resource_id: row[1] as number,
    current_quantity: row[2] as number,
    min_threshold: row[3] as number,
    unit: row[4] as string,
    updated_at: row[5] as string,
    name: row[6] as string,
    qr_code: row[7] as string,
    category: row[8] as string,
    created_at: row[9] as string,
  }
}

export function updateStockConfig(resourceId: number, data: { min_threshold?: number; unit?: string }): void {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.min_threshold !== undefined) { fields.push('min_threshold = ?'); values.push(data.min_threshold) }
  if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit) }
  if (fields.length === 0) return
  values.push(resourceId)
  db.run(`UPDATE consumable_stock SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE resource_id = ?`, values)
  saveDatabase()
}

export function updateStock(resourceId: number, quantity: number): void {
  const db = getDatabase()
  db.run('UPDATE consumable_stock SET current_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE resource_id = ?', [
    quantity, resourceId,
  ])
  saveDatabase()
}

export function createAlert(resourceId: number, requestedBy: number, notes: string): RestockAlertRow {
  const db = getDatabase()
  db.run(
    'INSERT INTO restock_alerts (resource_id, requested_by, notes) VALUES (?, ?, ?)',
    [resourceId, requestedBy, notes],
  )
  saveDatabase()

  const result = db.exec('SELECT * FROM restock_alerts WHERE id = last_insert_rowid()')
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    resource_id: row[1] as number,
    requested_by: row[2] as number,
    status: row[3] as 'pending',
    approved_by: row[4] as number | null,
    notes: row[5] as string,
    created_at: row[6] as string,
  }
}

export function updateAlertStatus(id: number, status: string, approvedBy: number): void {
  const db = getDatabase()
  db.run('UPDATE restock_alerts SET status = ?, approved_by = ? WHERE id = ?', [status, approvedBy, id])

  if (status === 'fulfilled') {
    const alert = db.exec('SELECT resource_id FROM restock_alerts WHERE id = ?', [id])
    if (alert.length > 0 && alert[0].values.length > 0) {
      const resourceId = alert[0].values[0][0] as number
      db.run(
        'UPDATE consumable_stock SET current_quantity = current_quantity + 50, updated_at = CURRENT_TIMESTAMP WHERE resource_id = ?',
        [resourceId],
      )
    }
  }

  saveDatabase()
}
