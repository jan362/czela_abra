"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";
import { formatDate, formatCurrency, formatFirma } from "@/lib/formatters";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "datVyst", label: "Datum", format: formatDate },
  { key: "typPohybuK", label: "Typ" },
  { key: "firma", label: "Firma", format: formatFirma },
  { key: "sumCelkem", label: "Částka", format: formatCurrency },
  { key: "mena", label: "Měna" },
  { key: "popis", label: "Popis" },
];

export default function CashPage() {
  return (
    <EvidencePage
      title="Pokladna"
      subtitle="Evidence: pokladni-pohyb — Pokladní pohyby"
      evidence="pokladni-pohyb"
      columns={columns}
      detail="custom:id,kod,datVyst,typPohybuK,firma,sumCelkem,mena,popis"
      order="datVyst@D"
      dateField="datVyst"
      dateFieldLabel="Datum pohybu"
      exportFilename="pokladna"
    />
  );
}
