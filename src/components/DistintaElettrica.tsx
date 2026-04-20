import { useState, useRef, useId, useCallback } from 'react'
import type { ComponenteElettrico, CampoModificabile } from '../types/distinta'
import './DistintaElettrica.css'

const UNITA_MISURA = ['pz', 'm', 'kg', 'mt', 'ml', 'set', 'cad', 'l', 'h']

function nextId(): string {
  return crypto.randomUUID()
}

function nuovoComponente(id: string): ComponenteElettrico {
  return {
    id,
    codice: '',
    descrizione: '',
    quantita: 1,
    unita: 'pz',
    prezzoUnitario: 0,
    produttore: '',
    fornitore: '',
    note: '',
  }
}

function prezzoTotale(c: ComponenteElettrico): number {
  return c.quantita * c.prezzoUnitario
}

function formatEuro(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function esportaCSV(righe: ComponenteElettrico[]): void {
  const intestazioni = [
    'Codice',
    'Descrizione',
    'Quantità',
    'Unità',
    'Prezzo Unitario (€)',
    'Prezzo Totale (€)',
    'Produttore',
    'Fornitore',
    'Note',
  ]
  const corpo = righe.map((r) =>
    [
      r.codice,
      r.descrizione,
      r.quantita,
      r.unita,
      r.prezzoUnitario.toFixed(2),
      prezzoTotale(r).toFixed(2),
      r.produttore,
      r.fornitore,
      r.note,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  )
  const csv = [intestazioni.join(';'), ...corpo].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'distinta_elettrica.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function importaCSV(
  testo: string,
  makeId: () => string
): ComponenteElettrico[] {
  const righe = testo.split(/\r?\n/).filter((r) => r.trim())
  if (righe.length < 2) return []
  return righe.slice(1).map((riga) => {
    const celle = riga
      .split(';')
      .map((c) => c.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'))
    return {
      id: makeId(),
      codice: celle[0] ?? '',
      descrizione: celle[1] ?? '',
      quantita: parseFloat(celle[2] ?? '1') || 1,
      unita: celle[3] ?? 'pz',
      prezzoUnitario: parseFloat((celle[4] ?? '0').replace(',', '.')) || 0,
      produttore: celle[6] ?? '',
      fornitore: celle[7] ?? '',
      note: celle[8] ?? '',
    }
  })
}

interface CellulaTesto {
  valore: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

function CellulaTesto({ valore, onChange, placeholder, className }: CellulaTesto) {
  return (
    <input
      type="text"
      className={`de-input${className ? ` ${className}` : ''}`}
      value={valore}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface CellulaNumero {
  valore: number
  onChange: (v: number) => void
  min?: number
  step?: number
}

function CellulaNumero({ valore, onChange, min = 0, step = 1 }: CellulaNumero) {
  return (
    <input
      type="number"
      className="de-input de-input--number"
      value={valore}
      min={min}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  )
}

interface CellulaUnita {
  valore: string
  onChange: (v: string) => void
}

function CellulaUnita({ valore, onChange }: CellulaUnita) {
  return (
    <select
      className="de-input de-input--select"
      value={valore}
      onChange={(e) => onChange(e.target.value)}
    >
      {UNITA_MISURA.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  )
}

export default function DistintaElettrica() {
  const [righe, setRighe] = useState<ComponenteElettrico[]>(() => [
    nuovoComponente(nextId()),
  ])
  const [erroreImport, setErroreImport] = useState('')
  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const aggiornaRiga = useCallback(
    (id: string, campo: CampoModificabile, valore: string | number) => {
      setRighe((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [campo]: valore } : r))
      )
    },
    []
  )

  const aggiungiRiga = useCallback(() => {
    setRighe((prev) => [...prev, nuovoComponente(nextId())])
  }, [])

  const eliminaRiga = useCallback((id: string) => {
    setRighe((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const duplicaRiga = useCallback((id: string) => {
    setRighe((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx === -1) return prev
      const copia: ComponenteElettrico = { ...prev[idx], id: nextId() }
      const aggiornate = [...prev]
      aggiornate.splice(idx + 1, 0, copia)
      return aggiornate
    })
  }, [])

  const svuota = useCallback(() => {
    if (window.confirm('Vuoi davvero eliminare tutte le righe?')) {
      setRighe([])
    }
  }, [])

  const handleImportaFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const testo = ev.target?.result as string
          const nuove = importaCSV(testo, nextId)
          if (nuove.length === 0) {
            setErroreImport('Nessuna riga trovata nel file.')
          } else {
            setRighe(nuove)
            setErroreImport('')
          }
        } catch {
          setErroreImport('Errore durante la lettura del file.')
        }
      }
      reader.readAsText(file, 'utf-8')
      if (fileRef.current) fileRef.current.value = ''
    },
    []
  )

  const totaleGenerale = righe.reduce((acc, r) => acc + prezzoTotale(r), 0)

  return (
    <div className="de-wrapper">
      <header className="de-header">
        <h1 className="de-title">⚡ Distinta Elettrica</h1>
        <p className="de-subtitle">
          Gestisci i componenti del tuo impianto elettrico
        </p>
      </header>

      <div className="de-toolbar">
        <button className="de-btn de-btn--primary" onClick={aggiungiRiga}>
          + Aggiungi riga
        </button>
        <button
          className="de-btn de-btn--secondary"
          onClick={() => esportaCSV(righe)}
        >
          ⬇ Esporta CSV
        </button>
        <label htmlFor={fileInputId} className="de-btn de-btn--secondary">
          ⬆ Importa CSV
        </label>
        <input
          id={fileInputId}
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="de-file-input"
          onChange={handleImportaFile}
        />
        {righe.length > 0 && (
          <button className="de-btn de-btn--danger" onClick={svuota}>
            🗑 Svuota tutto
          </button>
        )}
      </div>

      {erroreImport && <p className="de-errore">{erroreImport}</p>}

      <div className="de-table-container">
        <table className="de-table">
          <thead>
            <tr>
              <th className="de-th de-th--num">#</th>
              <th className="de-th">Codice</th>
              <th className="de-th de-th--wide">Descrizione</th>
              <th className="de-th de-th--num">Qtà</th>
              <th className="de-th">U.M.</th>
              <th className="de-th de-th--price">Prezzo Unit. (€)</th>
              <th className="de-th de-th--price">Totale (€)</th>
              <th className="de-th">Produttore</th>
              <th className="de-th">Fornitore</th>
              <th className="de-th de-th--wide">Note</th>
              <th className="de-th de-th--actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 ? (
              <tr>
                <td colSpan={11} className="de-empty">
                  Nessun componente. Clicca &quot;+ Aggiungi riga&quot; per iniziare.
                </td>
              </tr>
            ) : (
              righe.map((riga, idx) => (
                <tr key={riga.id} className="de-row">
                  <td className="de-td de-td--num">{idx + 1}</td>
                  <td className="de-td">
                    <CellulaTesto
                      valore={riga.codice}
                      placeholder="es. CB-001"
                      onChange={(v) => aggiornaRiga(riga.id, 'codice', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaTesto
                      valore={riga.descrizione}
                      placeholder="Descrizione componente"
                      onChange={(v) => aggiornaRiga(riga.id, 'descrizione', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaNumero
                      valore={riga.quantita}
                      min={0}
                      step={1}
                      onChange={(v) => aggiornaRiga(riga.id, 'quantita', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaUnita
                      valore={riga.unita}
                      onChange={(v) => aggiornaRiga(riga.id, 'unita', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaNumero
                      valore={riga.prezzoUnitario}
                      min={0}
                      step={0.01}
                      onChange={(v) =>
                        aggiornaRiga(riga.id, 'prezzoUnitario', v)
                      }
                    />
                  </td>
                  <td className="de-td de-td--total">
                    {formatEuro(prezzoTotale(riga))}
                  </td>
                  <td className="de-td">
                    <CellulaTesto
                      valore={riga.produttore}
                      placeholder="Produttore"
                      onChange={(v) => aggiornaRiga(riga.id, 'produttore', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaTesto
                      valore={riga.fornitore}
                      placeholder="Fornitore"
                      onChange={(v) => aggiornaRiga(riga.id, 'fornitore', v)}
                    />
                  </td>
                  <td className="de-td">
                    <CellulaTesto
                      valore={riga.note}
                      placeholder="Note"
                      onChange={(v) => aggiornaRiga(riga.id, 'note', v)}
                    />
                  </td>
                  <td className="de-td de-td--actions">
                    <button
                      className="de-icon-btn de-icon-btn--copy"
                      title="Duplica riga"
                      onClick={() => duplicaRiga(riga.id)}
                    >
                      ⎘
                    </button>
                    <button
                      className="de-icon-btn de-icon-btn--delete"
                      title="Elimina riga"
                      onClick={() => eliminaRiga(riga.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {righe.length > 0 && (
            <tfoot>
              <tr className="de-footer-row">
                <td colSpan={6} className="de-td de-td--footer-label">
                  Totale generale ({righe.length}{' '}
                  {righe.length === 1 ? 'componente' : 'componenti'})
                </td>
                <td className="de-td de-td--total de-td--grand-total">
                  {formatEuro(totaleGenerale)}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
