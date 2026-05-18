export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

export interface Resource {
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

export interface ConsumableStock {
  id: number
  resource_id: number
  current_quantity: number
  min_threshold: number
  unit: string
  updated_at: string
  name: string
  qr_code: string
  category: string
}

export interface LowStockItem {
  id: number
  resource_id: number
  current_quantity: number
  min_threshold: number
  unit: string
  updated_at: string
  name: string
  qr_code: string
}

export interface CheckInOutLog {
  id: number
  resource_id: number
  user_id: number
  action: 'checkout' | 'checkin'
  etr_minutes: number
  notes: string
  created_at: string
  user_name: string
  resource_name: string
}

export interface Incident {
  id: number
  resource_id: number
  reported_by: number
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  resolved_at: string | null
  user_name: string
  resource_name: string
}

export interface RestockAlert {
  id: number
  resource_id: number
  requested_by: number
  status: 'pending' | 'in_procurement' | 'fulfilled' | 'cancelled'
  approved_by: number | null
  notes: string
  created_at: string
  user_name: string
  resource_name: string
}

export interface UsageStat {
  resource_name: string
  qr_code: string
  total_checkouts: number
  total_minutes_used: number
}

export interface AuditLog {
  id: number
  action: string
  etr_minutes: number
  created_at: string
  user_name: string
  user_role: string
  resource_name: string
  qr_code: string
}

export interface HealthSummary {
  health_status: string
  count: number
}

export interface DashboardStats {
  stats: {
    totalResources: number
    inUse: number
    openIncidents: number
    pendingAlerts: number
  }
  activity: {
    action: string
    created_at: string
    user_name: string
    resource_name: string
  }[]
  topUsed: UsageStat[]
}
