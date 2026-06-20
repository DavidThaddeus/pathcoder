import { createClient, type Client } from '@libsql/client'

// libSQL / Turso client.
// - Production: set TURSO_DATABASE_URL (libsql://...) + TURSO_AUTH_TOKEN.
// - Local dev: with no Turso env vars, falls back to a local SQLite file so
//   you can develop without cloud credentials.
const url = process.env.TURSO_DATABASE_URL || 'file:./data/pathcoder.db'
const authToken = process.env.TURSO_AUTH_TOKEN

const globalForDb = globalThis as unknown as { __libsql?: Client }

export const db: Client =
  globalForDb.__libsql ?? createClient({ url, authToken })

if (!globalForDb.__libsql) {
  globalForDb.__libsql = db
}

// Schema is created once per process (idempotent). Every helper awaits this
// before running, so the tables always exist on a cold serverless start.
let schemaReady: Promise<void> | null = null
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id            TEXT PRIMARY KEY,
          email         TEXT NOT NULL UNIQUE,
          full_name     TEXT,
          password_hash TEXT NOT NULL,
          created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS challenges (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id              TEXT NOT NULL,
          challenge_id         TEXT NOT NULL,
          title                TEXT,
          programming_language TEXT,
          skill_level          TEXT,
          status               TEXT NOT NULL,
          attempts             INTEGER NOT NULL DEFAULT 0,
          max_attempts         INTEGER NOT NULL DEFAULT 3,
          challenge_data       TEXT,
          created_at           TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at         TEXT,
          failed_at            TEXT,
          UNIQUE(user_id, challenge_id)
        )
      `)
      // Migrations: add profile/points columns to existing user tables.
      // ADD COLUMN errors with "duplicate column name" if already present — ignore.
      for (const stmt of [
        `ALTER TABLE users ADD COLUMN display_name TEXT`,
        `ALTER TABLE users ADD COLUMN tech_role TEXT`,
        `ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 10`,
        `ALTER TABLE users ADD COLUMN completed_count INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN failed_count INTEGER NOT NULL DEFAULT 0`,
      ]) {
        try {
          await db.execute(stmt)
        } catch {
          /* column already exists */
        }
      }
    })()
  }
  return schemaReady
}

export interface UserRow {
  id: string
  email: string
  full_name: string | null
  password_hash: string
  created_at: string
  display_name: string | null
  tech_role: string | null
  points: number
  completed_count: number
  failed_count: number
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  await ensureSchema()
  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })
  return res.rows[0] as unknown as UserRow | undefined
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  await ensureSchema()
  const res = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
  return res.rows[0] as unknown as UserRow | undefined
}

export async function createUser(params: {
  id: string
  email: string
  fullName: string
  passwordHash: string
}): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `INSERT INTO users (id, email, full_name, password_hash)
          VALUES (?, ?, ?, ?)`,
    args: [params.id, params.email.toLowerCase(), params.fullName, params.passwordHash],
  })
}

export interface ChallengeRow {
  id: number
  user_id: string
  challenge_id: string
  title: string | null
  programming_language: string | null
  skill_level: string | null
  status: string
  attempts: number
  max_attempts: number
  challenge_data: string | null
  created_at: string
  completed_at: string | null
  failed_at: string | null
}

export interface UpsertChallengeParams {
  user_id: string
  challenge_id: string
  title?: string
  programmingLanguage?: string
  skillLevel?: string
  status: string
  attempts?: number
  maxAttempts?: number
  challengeData?: unknown
}

export async function findChallenge(
  user_id: string,
  challenge_id: string
): Promise<ChallengeRow | undefined> {
  await ensureSchema()
  const res = await db.execute({
    sql: 'SELECT * FROM challenges WHERE user_id = ? AND challenge_id = ?',
    args: [user_id, challenge_id],
  })
  return res.rows[0] as unknown as ChallengeRow | undefined
}

// Insert or update a challenge, setting status (and completed_at/failed_at as
// appropriate). Existing challenge_data is preserved if none is provided.
export async function upsertChallenge(params: UpsertChallengeParams): Promise<void> {
  await ensureSchema()
  const existing = await findChallenge(params.user_id, params.challenge_id)
  const completedAt = params.status === 'completed' ? new Date().toISOString() : null
  const failedAt = params.status === 'failed' ? new Date().toISOString() : null
  const challengeDataJson =
    params.challengeData !== undefined
      ? JSON.stringify(params.challengeData)
      : existing?.challenge_data ?? null

  if (existing) {
    await db.execute({
      sql: `UPDATE challenges SET
              title = ?,
              programming_language = ?,
              skill_level = ?,
              status = ?,
              attempts = ?,
              max_attempts = ?,
              challenge_data = ?,
              completed_at = COALESCE(?, completed_at),
              failed_at = COALESCE(?, failed_at)
            WHERE user_id = ? AND challenge_id = ?`,
      args: [
        params.title ?? existing.title,
        params.programmingLanguage ?? existing.programming_language,
        params.skillLevel ?? existing.skill_level,
        params.status,
        params.attempts ?? existing.attempts,
        params.maxAttempts ?? existing.max_attempts,
        challengeDataJson,
        completedAt,
        failedAt,
        params.user_id,
        params.challenge_id,
      ],
    })
  } else {
    await db.execute({
      sql: `INSERT INTO challenges
              (user_id, challenge_id, title, programming_language, skill_level,
               status, attempts, max_attempts, challenge_data, completed_at, failed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        params.user_id,
        params.challenge_id,
        params.title ?? `Challenge ${params.challenge_id}`,
        params.programmingLanguage ?? 'Unknown',
        params.skillLevel ?? 'Unknown',
        params.status,
        params.attempts ?? 0,
        params.maxAttempts ?? 3,
        challengeDataJson,
        completedAt,
        failedAt,
      ],
    })
  }

  // completed_at/failed_at are sticky (COALESCE preserves them through a retake
  // reset to 'ongoing'), so their presence on the PRE-upsert row is a reliable
  // "this challenge has already been resolved once before" signal — even
  // across a retake where current `status` has gone back to 'ongoing'.
  const alreadyResolved = !!(existing?.completed_at || existing?.failed_at)

  // Award points and bump lifetime completed/failed counters ONLY the very
  // first time a challenge resolves. Retaking (pass or fail) after that is
  // practice only — it must never add points or count again, or repeated
  // retakes would let a user farm points / inflate stats indefinitely.
  if (params.status === 'completed' && existing?.status !== 'completed' && !alreadyResolved) {
    const pts = computeChallengePoints(challengeDataJson)
    await addPoints(params.user_id, pts)
    await db.execute({
      sql: 'UPDATE users SET completed_count = completed_count + 1 WHERE id = ?',
      args: [params.user_id],
    })
  }
  if (params.status === 'failed' && existing?.status !== 'failed' && !alreadyResolved) {
    await db.execute({
      sql: 'UPDATE users SET failed_count = failed_count + 1 WHERE id = ?',
      args: [params.user_id],
    })
  }
}

// Points for a passed challenge: coding/debug = 10; quiz scales by question
// count (5–9 → 3, 10–15 → 5, 16–20 → 10).
function computeChallengePoints(challengeDataJson: string | null): number {
  try {
    if (!challengeDataJson) return 10
    const data = JSON.parse(challengeDataJson)
    const type = String(data.challengeType || data.type || '').toLowerCase()
    if (type === 'quiz') {
      const n = Array.isArray(data.questions) ? data.questions.length : 5
      if (n >= 16) return 10
      if (n >= 10) return 5
      return 3
    }
    return 10
  } catch {
    return 10
  }
}

export async function listChallenges(
  user_id: string,
  status?: string
): Promise<ChallengeRow[]> {
  await ensureSchema()
  const res = status
    ? await db.execute({
        sql: 'SELECT * FROM challenges WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
        args: [user_id, status],
      })
    : await db.execute({
        sql: 'SELECT * FROM challenges WHERE user_id = ? ORDER BY created_at DESC',
        args: [user_id],
      })
  return res.rows as unknown as ChallengeRow[]
}

export async function deleteChallenge(user_id: string, challenge_id: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'DELETE FROM challenges WHERE user_id = ? AND challenge_id = ?',
    args: [user_id, challenge_id],
  })
}

export async function deleteAllChallenges(user_id: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: 'DELETE FROM challenges WHERE user_id = ?', args: [user_id] })
}

// ---- Profile / points (coins) / leaderboard ----

export interface PublicProfile {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  tech_role: string | null
  points: number
  completed_count: number
  failed_count: number
}

export async function getProfile(id: string): Promise<PublicProfile | undefined> {
  const row = await findUserById(id)
  if (!row) return undefined
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    display_name: row.display_name,
    tech_role: row.tech_role,
    points: row.points ?? 0,
    completed_count: row.completed_count ?? 0,
    failed_count: row.failed_count ?? 0,
  }
}

export async function updateProfile(
  id: string,
  params: { displayName?: string; techRole?: string }
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE users SET
            display_name = COALESCE(?, display_name),
            tech_role = COALESCE(?, tech_role)
          WHERE id = ?`,
    args: [params.displayName ?? null, params.techRole ?? null, id],
  })
}

// Add (or subtract) points/coins. Returns the new balance.
export async function addPoints(id: string, delta: number): Promise<number> {
  await ensureSchema()
  await db.execute({
    sql: 'UPDATE users SET points = points + ? WHERE id = ?',
    args: [delta, id],
  })
  const row = await findUserById(id)
  return row?.points ?? 0
}

// Spend coins atomically. Returns the new balance, or null if insufficient.
export async function spendCoins(id: string, amount: number): Promise<number | null> {
  await ensureSchema()
  const res = await db.execute({
    sql: 'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?',
    args: [amount, id, amount],
  })
  if (res.rowsAffected === 0) return null // insufficient balance
  const row = await findUserById(id)
  return row?.points ?? 0
}

export interface LeaderboardEntry {
  id: string
  name: string
  tech_role: string | null
  points: number
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  await ensureSchema()
  const res = await db.execute({
    sql: `SELECT id, display_name, full_name, email, tech_role, points
          FROM users ORDER BY points DESC, created_at ASC LIMIT ?`,
    args: [limit],
  })
  return res.rows.map((r: any) => ({
    id: r.id,
    name: r.display_name || r.full_name || (r.email ? String(r.email).split('@')[0] : 'Anonymous'),
    tech_role: r.tech_role ?? null,
    points: r.points ?? 0,
  }))
}
