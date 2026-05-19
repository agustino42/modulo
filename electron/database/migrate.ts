import { getDatabase } from './connection'

export function runMigrations(): void {
  const db = getDatabase()

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','user')) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      type TEXT CHECK(type IN ('consumable','non-consumable')) NOT NULL,
      qr_code TEXT UNIQUE DEFAULT '',
      health_status TEXT CHECK(health_status IN ('excellent','needs_review','out_of_service')) DEFAULT 'excellent',
      current_user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS consumable_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      current_quantity REAL NOT NULL DEFAULT 0,
      min_threshold REAL NOT NULL DEFAULT 5,
      unit TEXT DEFAULT 'unidades',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS checkin_checkout_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT CHECK(action IN ('checkout','checkin')) NOT NULL,
      etr_minutes INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      reported_by INTEGER NOT NULL REFERENCES users(id),
      description TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('low','medium','high','critical')) DEFAULT 'low',
      status TEXT CHECK(status IN ('open','in_progress','resolved','closed')) DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS restock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      requested_by INTEGER NOT NULL REFERENCES users(id),
      status TEXT CHECK(status IN ('pending','in_procurement','fulfilled','cancelled')) DEFAULT 'pending',
      approved_by INTEGER REFERENCES users(id),
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      quantity_change REAL NOT NULL,
      type TEXT CHECK(type IN ('entry','exit')) NOT NULL,
      notes TEXT DEFAULT '',
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  seedIfEmpty(db)
}

function seedIfEmpty(db: ReturnType<typeof getDatabase>): void {
  const result = db.exec('SELECT COUNT(*) as count FROM users')
  const count = result[0]?.values[0]?.[0] ?? 0

  if (Number(count) === 0) {
    const bcryptjs = require('bcryptjs')
    const adminHash = bcryptjs.hashSync('admin123', 10)
    const userHash = bcryptjs.hashSync('user123', 10)

    db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      'Administrador', 'admin@modulo.com', adminHash, 'admin',
    ])
    db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      'Usuario Demo', 'user@modulo.com', userHash, 'user',
    ])

    const resources = [
      ['Taladro Percutor', 'Taladro profesional 20V', 'Herramientas', 'non-consumable', 'TAL-001'],
      ['Lijadora Orbital', 'Lijadora orbital 5"', 'Herramientas', 'non-consumable', 'LIJ-001'],
      ['Cinta Métrica 5m', 'Cinta métrica profesional', 'Medición', 'non-consumable', 'CIN-001'],
      ['Brocas 6mm', 'Pack 10 brocas para metal', 'Consumibles', 'consumable', 'BRO-001'],
      ['Discos de Corte', 'Pack 25 discos 4 1/2"', 'Consumibles', 'consumable', 'DIS-001'],
      ['Guantes Seguridad', 'Par talla L', 'EPP', 'consumable', 'GUA-001'],
    ]

    for (const [name, desc, category, type, qr] of resources) {
      db.run(
        'INSERT INTO resources (name, description, category, type, qr_code) VALUES (?, ?, ?, ?, ?)',
        [name, desc, category, type, qr]
      )
    }

    const resourceResult = db.exec('SELECT id, type FROM resources')

    for (const row of resourceResult[0]?.values ?? []) {
      const id = row[0] as number
      const type = row[1] as string
      if (type === 'consumable') {
        db.run(
          'INSERT INTO consumable_stock (resource_id, current_quantity, min_threshold, unit) VALUES (?, ?, ?, ?)',
          [id, 25, 5, 'unidades']
        )
      } else {
        db.run(
          'INSERT INTO consumable_stock (resource_id, current_quantity, min_threshold, unit) VALUES (?, ?, ?, ?)',
          [id, 50, 10, 'unidades']
        )
      }
    }
  }
}
