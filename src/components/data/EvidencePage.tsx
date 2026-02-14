"use client";

import { useState, useCallback } from "react";
import { useFlexiQuery } from "@/hooks/useFlexiQuery";
import { DataTable } from "./DataTable";
import type { ColumnDef } from "./DataTable";
import { FilterBar } from "./FilterBar";
import type { FilterValues } from "./FilterBar";
import { ExportButton } from "./ExportButton";
import { Pagination } from "./Pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EvidencePageProps {
  /** Page title */
  title: string;
  /** Page subtitle / description */
  subtitle?: string;
  /** Flexi evidence slug (e.g., "faktura-vydana") */
  evidence: string;
  /** Column definitions for DataTable and CSV export */
  columns: ColumnDef[];
  /** Flexi detail level */
  detail?: string;
  /** Default sort order (e.g., "datVyst@D") */
  order?: string;
  /** Records per page */
  pageSize?: number;
  /** Flexi date field for filtering (e.g., "datVyst", "datUcto") */
  dateField?: string;
  /** Label for the date field */
  dateFieldLabel?: string;
  /** Show accounting period presets */
  showAccountingPeriod?: boolean;
  /** CSV export filename prefix */
  exportFilename?: string;
  /** Additional static filter (always applied, combined with date filter via AND) */
  baseFilter?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EvidencePage({
  title,
  subtitle,
  evidence,
  columns,
  detail = "summary",
  order = "datVyst@D",
  pageSize = 50,
  dateField = "datVyst",
  dateFieldLabel = "Datum vystavení",
  showAccountingPeriod = true,
  exportFilename,
  baseFilter,
}: EvidencePageProps) {
  const [filterExpr, setFilterExpr] = useState("");
  const [filterLabel, setFilterLabel] = useState("Vše");
  const [page, setPage] = useState(0);

  // Combine base filter with date filter
  const combinedFilter = (() => {
    const parts: string[] = [];
    if (baseFilter) parts.push(baseFilter);
    if (filterExpr) parts.push(filterExpr);
    return parts.join(" and ");
  })();

  const { data, rowCount, isLoading, error } = useFlexiQuery({
    evidence,
    detail,
    filter: combinedFilter || undefined,
    order,
    limit: pageSize,
    start: page * pageSize,
  });

  const handleFilterChange = useCallback((values: FilterValues) => {
    setFilterExpr(values.filter);
    setFilterLabel(values.label);
    setPage(0); // Reset to first page when filter changes
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const csvFilename = exportFilename || evidence;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <ExportButton
            data={data}
            columns={columns}
            filename={csvFilename}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        dateField={dateField}
        dateFieldLabel={dateFieldLabel}
        showAccountingPeriod={showAccountingPeriod}
        onFilterChange={handleFilterChange}
        className="mb-4"
      />

      {/* Active filter + count info */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
          <span>
            Filtr: {filterLabel}
          </span>
          <span>
            {rowCount} záznamů
          </span>
        </div>
      )}

      {/* Data table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        error={error}
        rowCount={rowCount}
      />

      {/* Pagination */}
      {!isLoading && !error && rowCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={rowCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
