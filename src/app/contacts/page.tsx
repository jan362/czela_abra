"use client";

import { EvidencePage } from "@/components/data/EvidencePage";
import type { ColumnDef } from "@/components/data/DataTable";

const columns: ColumnDef[] = [
  { key: "kod", label: "Kód" },
  { key: "nazev", label: "Název" },
  { key: "ic", label: "IČO" },
  { key: "dic", label: "DIČ" },
  { key: "mesto", label: "Město" },
  { key: "ulice", label: "Ulice" },
  { key: "psc", label: "PSČ" },
  { key: "email", label: "E-mail" },
  { key: "tel", label: "Telefon" },
];

export default function ContactsPage() {
  return (
    <EvidencePage
      title="Adresář"
      subtitle="Evidence: adresar — Firmy a kontakty"
      evidence="adresar"
      columns={columns}
      detail="custom:id,kod,nazev,ic,dic,mesto,ulice,psc,email,tel"
      order="nazev@A"
      dateField="lastUpdate"
      dateFieldLabel="Poslední změna"
      showAccountingPeriod={false}
      exportFilename="adresar"
    />
  );
}
