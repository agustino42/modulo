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

export function createResource(data: Omit<ResourceRow, 'id' | 'created_at' | 'current_user_id'>): ResourceRow {
  const db = getDatabase()
  db.run(
    'INSERT INTO resources (name, description, category, type, qr_code, health_status) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.description, data.category, data.type, data.qr_code, data.health_status],
  )
  saveDatabase()

  const result = db.exec('SELECT * FROM resources WHERE qr_code = ?', [data.qr_code])
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
  db.run('DELETE FROM resources WHERE id = ?', [id])
  saveDatabase()
}
