import { getDatabase } from '../connection'

export function getUsageStats() {
  const db = getDatabase()
  const result = db.exec(`
    SELECT r.name as resource_name, r.qr_code,
           COUNT(CASE WHEN l.action = 'checkout' THEN 1 END) as total_checkouts,
           SUM(CASE WHEN l.action = 'checkout' THEN l.etr_minutes ELSE 0 END) as total_minutes_used
    FROM resources r
    LEFT JOIN checkin_checkout_log l ON l.resource_id = r.id
    GROUP BY r.id
    ORDER BY total_checkouts DESC
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    resource_name: row[0] as string,
    qr_code: row[1] as string,
    total_checkouts: row[2] as number,
    total_minutes_used: row[3] as number,
  }))
}

export function getAuditLogs() {
  const db = getDatabase()
  const result = db.exec(`
    SELECT l.id, l.action, l.etr_minutes, l.created_at,
           u.name as user_name, u.role,
           r.name as resource_name, r.qr_code
    FROM checkin_checkout_log l
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN resources r ON r.id = l.resource_id
    ORDER BY l.created_at DESC
    LIMIT 500
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    action: row[1] as string,
    etr_minutes: row[2] as number,
    created_at: row[3] as string,
    user_name: row[4] as string,
    user_role: row[5] as string,
    resource_name: row[6] as string,
    qr_code: row[7] as string,
  }))
}

export function getHealthSummary() {
  const db = getDatabase()
  const result = db.exec(`
    SELECT health_status, COUNT(*) as count
    FROM resources
    GROUP BY health_status
  `)

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    health_status: row[0] as string,
    count: row[1] as number,
  }))
}

export function getDashboardStats() {
  const db = getDatabase()

  const totalResources = db.exec('SELECT COUNT(*) FROM resources')
  const inUse = db.exec('SELECT COUNT(*) FROM resources WHERE current_user_id IS NOT NULL')
  const openIncidents = db.exec("SELECT COUNT(*) FROM incidents WHERE status IN ('open', 'in_progress')")
  const pendingAlerts = db.exec("SELECT COUNT(*) FROM restock_alerts WHERE status = 'pending'")

  const stats = {
    totalResources: totalResources[0]?.values[0]?.[0] ?? 0,
    inUse: inUse[0]?.values[0]?.[0] ?? 0,
    openIncidents: openIncidents[0]?.values[0]?.[0] ?? 0,
    pendingAlerts: pendingAlerts[0]?.values[0]?.[0] ?? 0,
  }

  const recentActivity = db.exec(`
    SELECT l.action, l.created_at, u.name as user_name, r.name as resource_name
    FROM checkin_checkout_log l
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN resources r ON r.id = l.resource_id
    ORDER BY l.created_at DESC
    LIMIT 10
  `)

  const activity = recentActivity.length > 0
    ? recentActivity[0].values.map((row) => ({
        action: row[0] as string,
        created_at: row[1] as string,
        user_name: row[2] as string,
        resource_name: row[3] as string,
      }))
    : []

  const topUsed = getUsageStats().slice(0, 5)

  return { stats, activity, topUsed }
}
