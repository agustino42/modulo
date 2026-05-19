import { getDatabase, saveDatabase } from '../connection'
import bcryptjs from 'bcryptjs'

export interface UserRow {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'admin' | 'user'
  created_at: string
}

export function authenticateUser(email: string, password: string): Omit<UserRow, 'password_hash'> | null {
  const db = getDatabase()
  const result = db.exec('SELECT * FROM users WHERE email = ?', [email])

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  const user: UserRow = {
    id: row[0] as number,
    name: row[1] as string,
    email: row[2] as string,
    password_hash: row[3] as string,
    role: row[4] as 'admin' | 'user',
    created_at: row[5] as string,
  }

  const valid = bcryptjs.compareSync(password, user.password_hash)
  if (!valid) return null

  const { password_hash, ...safeUser } = user
  return safeUser
}

export function getAllUsers(): Omit<UserRow, 'password_hash'>[] {
  const db = getDatabase()
  const result = db.exec('SELECT id, name, email, role, created_at FROM users ORDER BY name')

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    name: row[1] as string,
    email: row[2] as string,
    role: row[3] as 'admin' | 'user',
    created_at: row[4] as string,
  }))
}

export function createUser(name: string, email: string, password: string, role: 'admin' | 'user'): Omit<UserRow, 'password_hash'> {
  const db = getDatabase()
  const hash = bcryptjs.hashSync(password, 10)

  db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
    name, email, hash, role,
  ])

  saveDatabase()

  const result = db.exec('SELECT id, name, email, role, created_at FROM users WHERE email = ?', [email])
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    name: row[1] as string,
    email: row[2] as string,
    role: row[3] as 'admin' | 'user',
    created_at: row[4] as string,
  }
}

export function updateUser(id: number, data: Partial<{ name: string; email: string; role: string; password: string }>): void {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
  if (data.password !== undefined) {
    const hash = bcryptjs.hashSync(data.password, 10)
    fields.push('password_hash = ?')
    values.push(hash)
  }

  if (fields.length === 0) return

  values.push(id)
  db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDatabase()
}
