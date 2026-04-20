import { useState, useRef, useEffect, useCallback } from 'react'
import { cercaArticoli, type Articolo } from '../services/articoli'

interface Props {
  valore: string
  /** Aggiorna solo il codice mentre l'utente digita */
  onChange: (codice: string) => void
  /** Chiamato quando l'utente seleziona un articolo dal dropdown SAP */
  onSeleziona: (codice: string, descrizione: string) => void
}

export default function CodiceArticoloInput({
  valore,
  onChange,
  onSeleziona,
}: Props) {
  const [suggerimenti, setSuggerimenti] = useState<Articolo[]>([])
  const [aperto, setAperto] = useState(false)
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState('')
  const [indiceSel, setIndiceSel] = useState(-1)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Chiudi dropdown al click esterno
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setAperto(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Scorri la voce selezionata nella lista
  useEffect(() => {
    if (indiceSel >= 0 && listRef.current) {
      const el = listRef.current.children[indiceSel] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [indiceSel])

  const cerca = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) {
      setSuggerimenti([])
      setAperto(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setCaricamento(true)
      setErrore('')
      try {
        const items = await cercaArticoli(q)
        setSuggerimenti(items)
        setAperto(items.length > 0)
        setIndiceSel(-1)
      } catch (err) {
        setErrore(err instanceof Error ? err.message : 'Errore ricerca SAP')
        setAperto(false)
      } finally {
        setCaricamento(false)
      }
    }, 300)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    cerca(e.target.value)
  }

  function seleziona(item: Articolo) {
    onSeleziona(item.ItemCode, item.ItemName)
    setSuggerimenti([])
    setAperto(false)
    setErrore('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aperto) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceSel((i) => Math.min(i + 1, suggerimenti.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceSel((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && indiceSel >= 0) {
      e.preventDefault()
      seleziona(suggerimenti[indiceSel])
    } else if (e.key === 'Escape') {
      setAperto(false)
    }
  }

  return (
    <div ref={wrapperRef} className="de-autocomplete">
      <input
        type="text"
        className={`de-input de-autocomplete__input${caricamento ? ' de-autocomplete__input--loading' : ''}`}
        value={valore}
        placeholder="Cerca in SAP…"
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggerimenti.length > 0 && setAperto(true)}
      />
      {errore && <p className="de-sap-errore">{errore}</p>}
      {aperto && (
        <ul
          ref={listRef}
          className="de-autocomplete__lista"
          role="listbox"
        >
          {suggerimenti.map((item, i) => (
            <li
              key={item.ItemCode}
              className={`de-autocomplete__voce${i === indiceSel ? ' de-autocomplete__voce--attiva' : ''}`}
              role="option"
              aria-selected={i === indiceSel}
              onMouseDown={(e) => {
                e.preventDefault() // evita blur prima del click
                seleziona(item)
              }}
            >
              <span className="de-autocomplete__codice">{item.ItemCode}</span>
              <span className="de-autocomplete__nome">{item.ItemName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
