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
