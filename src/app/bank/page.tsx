"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";
import { formatDate, formatCurrency, formatFirma, formatBoolean } from "@/lib/formatters";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "datVyst", label: "Datum", format: formatDate },
  { key: "typPohybuK", label: "Typ" },
  { key: "firma", label: "Firma", format: formatFirma },
  { key: "varSym", label: "VS" },
  { key: "sumCelkem", label: "Částka", format: formatCurrency },
  { key: "mena", label: "Měna" },
  { key: "sparovano", label: "Spárováno", format: formatBoolean },
  { key: "popis", label: "Popis" },
];

export default function BankPage() {
  return (
    <EvidencePage
      title="Banka"
      subtitle="Evidence: banka — Bankovní transakce"
      evidence="banka"
      columns={columns}
      detail="custom:id,kod,datVyst,typPohybuK,firma,varSym,sumCelkem,mena,sparovano,popis"
      order="datVyst@D"
      dateField="datVyst"
      dateFieldLabel="Datum pohybu"
      exportFilename="banka"
    />
  );
}
