import { getDatabase, saveDatabase } from '../connection'

export interface IncidentRow {
  id: number
  resource_id: number
  reported_by: number
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  resolved_at: string | null
}

export function getAllIncidents(): (IncidentRow & { user_name: string; resource_name: string })[] {
  const db = getDatabase()
  const result = db.exec(`
    SELECT i.id, i.resource_id, i.reported_by, i.description, i.severity, i.status, i.created_at, i.resolved_at,
           u.name as user_name, r.name as resource_name
    FROM incidents i
    LEFT JOIN users u ON u.id = i.reported_by
    LEFT JOIN resources r ON r.id = i.resource_id
    ORDER BY i.created_at DESC
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    resource_id: row[1] as number,
    reported_by: row[2] as number,
    description: row[3] as string,
    severity: row[4] as 'low' | 'medium' | 'high' | 'critical',
    status: row[5] as 'open' | 'in_progress' | 'resolved' | 'closed',
    created_at: row[6] as string,
    resolved_at: row[7] as string | null,
    user_name: row[8] as string,
    resource_name: row[9] as string,
  }))
}

export function createIncident(
  resourceId: number,
  reportedBy: number,
  description: string,
  severity: string,
): IncidentRow {
  const db = getDatabase()
  db.run(
    'INSERT INTO incidents (resource_id, reported_by, description, severity) VALUES (?, ?, ?, ?)',
    [resourceId, reportedBy, description, severity],
  )

  const rowidResult = db.exec('SELECT last_insert_rowid()')
  if (!rowidResult[0]?.values?.length) {
    throw new Error('Failed to create incident: No rowid returned after insertion')
  }
  const newId = rowidResult[0].values[0][0] as number

  saveDatabase()

  const result = db.exec('SELECT * FROM incidents WHERE id = ?', [newId])
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create incident: No record found after insertion')
  }
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    resource_id: row[1] as number,
    reported_by: row[2] as number,
    description: row[3] as string,
    severity: row[4] as 'low' | 'medium' | 'high' | 'critical',
    status: row[5] as 'open' | 'in_progress' | 'resolved' | 'closed',
    created_at: row[6] as string,
    resolved_at: row[7] as string | null,
  }
}

export function updateIncidentStatus(id: number, status: string): void {
  const db = getDatabase()

  if (status === 'resolved' || status === 'closed') {
    db.run('UPDATE incidents SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id])

    const incident = db.exec('SELECT resource_id FROM incidents WHERE id = ?', [id])
    if (incident.length > 0 && incident[0].values.length > 0) {
      const resourceId = incident[0].values[0][0] as number
      db.run('UPDATE resources SET health_status = ? WHERE id = ?', [
        status === 'resolved' ? 'excellent' : 'needs_review',
        resourceId,
      ])
    }
  } else {
    db.run('UPDATE incidents SET status = ? WHERE id = ?', [status, id])
  }

  saveDatabase()
}

export function updateIncident(id: number, description: string, severity: string): void {
  const db = getDatabase()
  db.run('UPDATE incidents SET description = ?, severity = ? WHERE id = ?', [description, severity, id])
  saveDatabase()
}

export function deleteIncident(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM incidents WHERE id = ?', [id])
  saveDatabase()
}

export function getIncidentById(id: number): (IncidentRow & { user_name: string; resource_name: string }) | null {
  const db = getDatabase()
  const result = db.exec(`
    SELECT i.id, i.resource_id, i.reported_by, i.description, i.severity, i.status, i.created_at, i.resolved_at,
           u.name as user_name, r.name as resource_name
    FROM incidents i
    LEFT JOIN users u ON u.id = i.reported_by
    LEFT JOIN resources r ON r.id = i.resource_id
    WHERE i.id = ?
  `, [id])

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    resource_id: row[1] as number,
    reported_by: row[2] as number,
    description: row[3] as string,
    severity: row[4] as 'low' | 'medium' | 'high' | 'critical',
    status: row[5] as 'open' | 'in_progress' | 'resolved' | 'closed',
    created_at: row[6] as string,
    resolved_at: row[7] as string | null,
    user_name: row[8] as string,
    resource_name: row[9] as string,
  }
}
