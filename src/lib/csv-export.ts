import type { ColumnDef } from "@/components/data/DataTable";

/**
 * Convert data array + column definitions into a CSV string.
 * Uses semicolon separator (common in Czech locale) and UTF-8 BOM for Excel compatibility.
 */
export function generateCsv(
  data: Record<string, unknown>[],
  columns: ColumnDef[]
): string {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel
  const SEP = ";";

  // Header row
  const header = columns.map((col) => escapeCsvField(col.label)).join(SEP);

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const display = col.format
          ? col.format(value)
          : value != null
          ? String(value)
          : "";
        return escapeCsvField(display);
      })
      .join(SEP)
  );

  return BOM + [header, ...rows].join("\r\n");
}

/**
 * Escape a field for CSV: wrap in quotes if it contains separator, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Trigger a browser download of a CSV string.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
