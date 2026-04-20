export interface ComponenteElettrico {
  id: string;
  codice: string;
  descrizione: string;
  quantita: number;
  unita: string;
  prezzoUnitario: number;
  produttore: string;
  fornitore: string;
  note: string;
}

export type CampoModificabile = keyof Omit<ComponenteElettrico, 'id'>;
