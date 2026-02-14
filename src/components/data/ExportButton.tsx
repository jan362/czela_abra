"use client";

import { generateCsv, downloadCsv } from "@/lib/csv-export";
import type { ColumnDef } from "./DataTable";

interface Props {
  /** Data to export */
  data: Record<string, unknown>[];
  /** Column definitions (used for headers and formatting) */
  columns: ColumnDef[];
  /** Filename without extension */
  filename: string;
  /** Disabled state */
  disabled?: boolean;
}

export function ExportButton({ data, columns, filename, disabled }: Props) {
  const handleExport = () => {
    if (data.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const csv = generateCsv(data, columns);
    downloadCsv(csv, `${filename}_${timestamp}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Exportovat do CSV"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Export CSV
    </button>
  );
}
