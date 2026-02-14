"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "nazev", label: "Název" },
  { key: "popis", label: "Popis" },
];

export default function WarehousePage() {
  return (
    <EvidencePage
      title="Sklady"
      subtitle="Evidence: sklad"
      evidence="sklad"
      columns={columns}
      detail="custom:id,kod,nazev,popis"
      order="kod@A"
      showAccountingPeriod={false}
      exportFilename="sklady"
    />
  );
}
