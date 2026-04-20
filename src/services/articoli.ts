export interface Articolo {
  ItemCode: string
  ItemName: string
}

/**
 * Cerca articoli nella tabella OITM di SAP tramite il dev-server Vite.
 * Endpoint: GET /api/articoli?q=<testo>
 */
export async function cercaArticoli(query: string): Promise<Articolo[]> {
  if (!query.trim()) return []
  const res = await fetch(`/api/articoli?q=${encodeURIComponent(query)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `Errore server (${res.status})`
    )
  }
  return res.json() as Promise<Articolo[]>
}
