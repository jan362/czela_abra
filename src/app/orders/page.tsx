"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";
import { formatDate, formatCurrency, formatFirma, formatPaymentStatus } from "@/lib/formatters";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "datVyst", label: "Datum", format: formatDate },
  { key: "firma", label: "Firma", format: formatFirma },
  { key: "sumCelkem", label: "Celkem", format: formatCurrency },
  { key: "mena", label: "Měna" },
  { key: "stavUhrK", label: "Stav", format: formatPaymentStatus },
  { key: "popis", label: "Popis" },
];

export default function OrdersPage() {
  return (
    <EvidencePage
      title="Objednávky přijaté"
      subtitle="Evidence: objednavka-prijata"
      evidence="objednavka-prijata"
      columns={columns}
      detail="custom:id,kod,datVyst,firma,sumCelkem,mena,stavUhrK,popis"
      order="datVyst@D"
      dateField="datVyst"
      dateFieldLabel="Datum objednávky"
      exportFilename="objednavky-prijate"
    />
  );
}
