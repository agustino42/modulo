import { getDatabase, saveDatabase } from '../connection'

export interface ResourceRow {
  id: number
  name: string
  description: string
  category: string
  type: 'consumable' | 'non-consumable'
  qr_code: string
  health_status: 'excellent' | 'needs_review' | 'out_of_service'
  current_user_id: number | null
  created_at: string
}

export function getAllResources(): ResourceRow[] {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM resources ORDER BY name')

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    name: row[1] as string,
    description: row[2] as string,
    category: row[3] as string,
    type: row[4] as 'consumable' | 'non-consumable',
    qr_code: row[5] as string,
    health_status: row[6] as 'excellent' | 'needs_review' | 'out_of_service',
    current_user_id: row[7] as number | null,
    created_at: row[8] as string,
  }))
}

export function getResourceById(id: number): ResourceRow | null {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM resources WHERE id = ?', [id])

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    name: row[1] as string,
    description: row[2] as string,
    category: row[3] as string,
    type: row[4] as 'consumable' | 'non-consumable',
    qr_code: row[5] as string,
    health_status: row[6] as 'excellent' | 'needs_review' | 'out_of_service',
    current_user_id: row[7] as number | null,
    created_at: row[8] as string,
  }
}

export function createResource(data: Omit<ResourceRow, 'id' | 'created_at' | 'current_user_id'> & {
  initial_quantity?: number
  min_threshold?: number
  unit?: string
}): ResourceRow {
  const db = getDatabase()

  const finalQrCode = data.qr_code || `QR-${Date.now()}`
  const finalData = { ...data, qr_code: finalQrCode }

  db.run(
    'INSERT INTO resources (name, description, category, type, qr_code, health_status) VALUES (?, ?, ?, ?, ?, ?)',
    [finalData.name, finalData.description, finalData.category, finalData.type, finalData.qr_code, finalData.health_status],
  )

  saveDatabase()

  const resourceRes = db.exec('SELECT id FROM resources WHERE qr_code = ?', [finalQrCode])
  if (!resourceRes[0]?.values?.length) throw new Error('Error al crear recurso')
  const resourceId = resourceRes[0].values[0][0] as number

  if (data.type === 'consumable') {
    db.run(
      'INSERT INTO consumable_stock (resource_id, current_quantity, min_threshold, unit) VALUES (?, ?, ?, ?)',
      [resourceId, data.initial_quantity ?? 0, data.min_threshold ?? 5, data.unit ?? 'unidades'],
    )
  }

  saveDatabase()

  const result = db.exec('SELECT * FROM resources WHERE id = ?', [resourceId])
  if (!result[0]?.values?.length) throw new Error('Error al recuperar recurso')
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    name: row[1] as string,
    description: row[2] as string,
    category: row[3] as string,
    type: row[4] as 'consumable' | 'non-consumable',
    qr_code: row[5] as string,
    health_status: row[6] as 'excellent' | 'needs_review' | 'out_of_service',
    current_user_id: row[7] as number | null,
    created_at: row[8] as string,
  }
}

export function updateResource(id: number, data: Partial<ResourceRow>): void {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []

  const allowed = ['name', 'description', 'category', 'type', 'qr_code', 'health_status']
  for (const field of allowed) {
    if ((data as any)[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push((data as any)[field])
    }
  }

  if (fields.length === 0) return

  values.push(id)
  db.run(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDatabase()
}

export function deleteResource(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM stock_movements WHERE resource_id = ?', [id])
  db.run('DELETE FROM restock_alerts WHERE resource_id = ?', [id])
  db.run('DELETE FROM checkin_checkout_log WHERE resource_id = ?', [id])
  db.run('DELETE FROM incidents WHERE resource_id = ?', [id])
  db.run('DELETE FROM consumable_stock WHERE resource_id = ?', [id])
  db.run('DELETE FROM resources WHERE id = ?', [id])
  saveDatabase()
}
