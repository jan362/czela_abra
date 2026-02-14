"use client";

export interface ColumnDef {
  /** Key in the record object */
  key: string;
  /** Column header label */
  label: string;
  /** Optional formatter */
  format?: (value: unknown) => string;
}

interface Props {
  columns: ColumnDef[];
  data: Record<string, unknown>[];
  isLoading?: boolean;
  error?: string | null;
  rowCount?: number;
}

export function DataTable({ columns, data, isLoading, error, rowCount }: Props) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Chyba</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="mt-2 text-sm text-gray-500">Načítání...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        <p>Žádné záznamy</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {rowCount !== undefined && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
          Celkem záznamů: {rowCount}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => {
                  const value = row[col.key];
                  const display = col.format
                    ? col.format(value)
                    : value != null
                    ? String(value)
                    : "";
                  return (
                    <td key={col.key} className="px-4 py-3 text-gray-900">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
