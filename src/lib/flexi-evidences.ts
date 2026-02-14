/**
 * Evidence registry — central catalog of Flexi API evidence types.
 * Adding a new evidence here makes it available throughout the app.
 */

export type EvidenceCategory =
  | "invoicing"
  | "banking"
  | "cash"
  | "contacts"
  | "warehouse"
  | "orders"
  | "pricelist"
  | "internal"
  | "reports"
  | "settings";

export interface EvidenceDefinition {
  /** URL path segment, e.g., "faktura-vydana" */
  slug: string;
  /** English display name */
  label: string;
  /** Czech display name */
  labelCs: string;
  /** Category for grouping */
  category: EvidenceCategory;
  /** Related line-items evidence, e.g., "faktura-vydana-polozka" */
  itemEvidence?: string;
}

export const EVIDENCES: Record<string, EvidenceDefinition> = {
  "faktura-vydana": {
    slug: "faktura-vydana",
    label: "Issued Invoices",
    labelCs: "Faktury vydané",
    category: "invoicing",
    itemEvidence: "faktura-vydana-polozka",
  },
  "faktura-prijata": {
    slug: "faktura-prijata",
    label: "Received Invoices",
    labelCs: "Faktury přijaté",
    category: "invoicing",
    itemEvidence: "faktura-prijata-polozka",
  },
  "banka": {
    slug: "banka",
    label: "Bank Transactions",
    labelCs: "Banka",
    category: "banking",
  },
  "pokladni-pohyb": {
    slug: "pokladni-pohyb",
    label: "Cash Transactions",
    labelCs: "Pokladní pohyby",
    category: "cash",
  },
  "adresar": {
    slug: "adresar",
    label: "Address Book",
    labelCs: "Adresář",
    category: "contacts",
  },
  "objednavka-prijata": {
    slug: "objednavka-prijata",
    label: "Received Orders",
    labelCs: "Objednávky přijaté",
    category: "orders",
    itemEvidence: "objednavka-prijata-polozka",
  },
  "objednavka-vydana": {
    slug: "objednavka-vydana",
    label: "Issued Orders",
    labelCs: "Objednávky vydané",
    category: "orders",
    itemEvidence: "objednavka-vydana-polozka",
  },
  "cenik": {
    slug: "cenik",
    label: "Price List",
    labelCs: "Ceník",
    category: "pricelist",
  },
  "sklad": {
    slug: "sklad",
    label: "Warehouses",
    labelCs: "Sklady",
    category: "warehouse",
  },
  "skladova-karta": {
    slug: "skladova-karta",
    label: "Warehouse Cards",
    labelCs: "Skladové karty",
    category: "warehouse",
  },
};
