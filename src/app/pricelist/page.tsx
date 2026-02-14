"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";
import { formatCurrency } from "@/lib/formatters";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "nazev", label: "Název" },
  { key: "cenBezDph", label: "Cena bez DPH", format: formatCurrency },
  { key: "cenSDph", label: "Cena s DPH", format: formatCurrency },
  { key: "mpiJed", label: "MJ" },
  { key: "ean", label: "EAN" },
  { key: "ppiSzbDph", label: "Sazba DPH" },
];

export default function PricelistPage() {
  return (
    <EvidencePage
      title="Ceník"
      subtitle="Evidence: cenik — Produkty a služby"
      evidence="cenik"
      columns={columns}
      detail="custom:id,kod,nazev,cenBezDph,cenSDph,mpiJed,ean,ppiSzbDph"
      order="kod@A"
      showAccountingPeriod={false}
      exportFilename="cenik"
    />
  );
}
