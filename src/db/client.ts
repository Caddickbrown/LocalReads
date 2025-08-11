import Database from 'tauri-plugin-sql-api'

let dbPromise: Promise<any> | null = null

export async function getDb() {
  if (!dbPromise) {
    // Default DB (single file in app data dir). You can swap to a chosen path later.
    dbPromise = Database.load('sqlite:localreads.sqlite')
  }
  const db = await dbPromise
  return db
}

export async function execSchema(sql: string) {
  const db = await getDb()
  return db.execute(sql)
}