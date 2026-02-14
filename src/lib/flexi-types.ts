/**
 * Standard Flexi JSON response wrapper.
 * All Flexi responses are wrapped in a "winstrom" envelope.
 */
export interface FlexiEnvelope<T = Record<string, unknown>> {
  winstrom: {
    "@version": string;
    "@rowCount"?: string;
    "@globalVersion"?: string;
    [evidence: string]: T[] | string | undefined;
  };
}

/**
 * Write operation result from Flexi (create/update/delete).
 */
export interface FlexiWriteResult {
  winstrom: {
    "@version": string;
    success: string;
    stats: {
      created: string;
      updated: string;
      deleted: string;
      skipped: string;
      failed: string;
    };
    results?: Array<{
      id: string;
      ref: string;
      [key: string]: unknown;
    }>;
  };
}

/**
 * Common fields present on most Flexi records.
 */
export interface FlexiBaseRecord {
  id: number;
  kod?: string;
  lastUpdate?: string;
  externId?: string[];
}

/**
 * Issued invoice (faktura-vydana) key fields.
 */
export interface FakturaVydana extends FlexiBaseRecord {
  typDokl?: string;
  datVyst?: string;
  datSplat?: string;
  firma?: string;
  sumCelkem?: number;
  sumCelkemMen?: number;
  mena?: string;
  stavUhrK?: string;
  varSym?: string;
  popis?: string;
}

/**
 * Received invoice (faktura-prijata) key fields.
 */
export interface FakturaPrijata extends FlexiBaseRecord {
  typDokl?: string;
  datVyst?: string;
  datSplat?: string;
  firma?: string;
  sumCelkem?: number;
  mena?: string;
  stavUhrK?: string;
  varSym?: string;
  popis?: string;
  cisDosle?: string;
}

/**
 * Address book record (adresar) key fields.
 */
export interface Adresar extends FlexiBaseRecord {
  nazev?: string;
  ulice?: string;
  mesto?: string;
  psc?: string;
  stat?: string;
  ic?: string;
  dic?: string;
  email?: string;
  tel?: string;
}

/**
 * Bank transaction (banka) key fields.
 */
export interface BankaRecord extends FlexiBaseRecord {
  typDokl?: string;
  datVyst?: string;
  sumCelkem?: number;
  mena?: string;
  popis?: string;
  banka?: string;
}
