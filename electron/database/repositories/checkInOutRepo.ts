import { getDatabase, saveDatabase } from '../connection'
import { updateStock } from './stockRepo'

export interface CheckInOutLogRow {
  id: number
  resource_id: number
  user_id: number
  action: 'checkout' | 'checkin'
  etr_minutes: number
  notes: string
  created_at: string
}

export function checkout(resourceId: number, userId: number, etrMinutes: number): boolean {
  const db = getDatabase()

  const current = db.exec('SELECT current_user_id, type FROM resources WHERE id = ?', [resourceId])
  if (current.length === 0 || current[0].values.length === 0) return false

  const currentUserId = current[0].values[0][0]
  const resourceType = current[0].values[0][1] as string
  if (currentUserId !== null) return false

  db.run('UPDATE resources SET current_user_id = ? WHERE id = ?', [userId, resourceId])
  db.run(
    'INSERT INTO checkin_checkout_log (resource_id, user_id, action, etr_minutes) VALUES (?, ?, ?, ?)',
    [resourceId, userId, 'checkout', etrMinutes],
  )

  if (resourceType === 'consumable') {
    const stock = db.exec('SELECT current_quantity FROM consumable_stock WHERE resource_id = ?', [resourceId])
    if (stock.length > 0 && stock[0].values.length > 0) {
      const qty = stock[0].values[0][0] as number
      if (qty > 0) {
        updateStock(resourceId, qty - 1)
      }
    }
  }

  saveDatabase()
  return true
}

export function checkin(resourceId: number): boolean {
  const db = getDatabase()

  const current = db.exec('SELECT current_user_id FROM resources WHERE id = ?', [resourceId])
  if (current.length === 0 || current[0].values.length === 0) return false

  const currentUserId = current[0].values[0][0]
  if (currentUserId === null) return false

  db.run('UPDATE resources SET current_user_id = NULL WHERE id = ?', [resourceId])
  db.run(
    'INSERT INTO checkin_checkout_log (resource_id, user_id, action) VALUES (?, ?, ?)',
    [resourceId, currentUserId, 'checkin'],
  )

  saveDatabase()
  return true
}

export function getCheckInOutLogs(resourceId?: number): (CheckInOutLogRow & { user_name: string; resource_name: string })[] {
  const db = getDatabase()

  let query = `
    SELECT l.id, l.resource_id, l.user_id, l.action, l.etr_minutes, l.notes, l.created_at,
           u.name as user_name, r.name as resource_name
    FROM checkin_checkout_log l
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN resources r ON r.id = l.resource_id
  `
  const params: any[] = []

  if (resourceId !== undefined) {
    query += ' WHERE l.resource_id = ?'
    params.push(resourceId)
  }

  query += ' ORDER BY l.created_at DESC LIMIT 200'

  const result = db.exec(query, params)
  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    user_id: row[2] as number,
    action: row[3] as 'checkout' | 'checkin',
    etr_minutes: row[4] as number,
    notes: row[5] as string,
    created_at: row[6] as string,
    user_name: row[7] as string,
    resource_name: row[8] as string,
  }))
}
