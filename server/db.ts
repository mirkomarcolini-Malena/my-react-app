import sql from 'mssql'

export interface Articolo {
  ItemCode: string
  ItemName: string
}

export interface DbConfig {
  server: string
  database: string
  user: string
  password: string
}

let pool: sql.ConnectionPool | null = null

async function getPool(cfg: DbConfig): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool
  pool = new sql.ConnectionPool({
    server: cfg.server,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    port: 1433,
    connectionTimeout: 8000,
    requestTimeout: 8000,
  })
  await pool.connect()
  return pool
}

export async function cercaArticoliDB(
  q: string,
  cfg: DbConfig
): Promise<Articolo[]> {
  if (!q.trim()) return []
  const p = await getPool(cfg)
  const result = await p
    .request()
    .input('q', sql.NVarChar(100), q)
    .query<Articolo>(
      `SELECT TOP 15
         ItemCode,
         ItemName
       FROM OITM
       WHERE ItemCode LIKE @q + '%'
          OR ItemName LIKE '%' + @q + '%'
       ORDER BY ItemCode`
    )
  return result.recordset
}
