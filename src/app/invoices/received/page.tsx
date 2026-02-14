"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";
import { formatDate, formatCurrency, formatPaymentStatus, formatFirma } from "@/lib/formatters";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "cisDosle", label: "Číslo došlé" },
  { key: "datVyst", label: "Vystaveno", format: formatDate },
  { key: "datSplat", label: "Splatnost", format: formatDate },
  { key: "firma", label: "Firma", format: formatFirma },
  { key: "varSym", label: "VS" },
  { key: "sumCelkem", label: "Celkem", format: formatCurrency },
  { key: "mena", label: "Měna" },
  { key: "stavUhrK", label: "Stav úhrady", format: formatPaymentStatus },
];

export default function ReceivedInvoicesPage() {
  return (
    <EvidencePage
      title="Faktury přijaté"
      subtitle="Evidence: faktura-prijata"
      evidence="faktura-prijata"
      columns={columns}
      detail="custom:id,kod,cisDosle,datVyst,datSplat,firma,varSym,sumCelkem,mena,stavUhrK,popis"
      order="datVyst@D"
      dateField="datVyst"
      dateFieldLabel="Datum vystavení"
      exportFilename="faktury-prijate"
    />
  );
}
