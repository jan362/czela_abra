"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterValues {
  /** Flexi filter expression string */
  filter: string;
  /** Human-readable label for the active filter */
  label: string;
}

export interface FilterBarProps {
  /** The Flexi date field name to filter on (e.g., "datVyst", "datUcto") */
  dateField?: string;
  /** Label for the date field (e.g., "Datum vystavení") */
  dateFieldLabel?: string;
  /** Whether this evidence supports accounting period filter */
  showAccountingPeriod?: boolean;
  /** Callback when filter changes */
  onFilterChange: (values: FilterValues) => void;
  /** Extra CSS classes */
  className?: string;
}

// ─── Accounting period presets ───────────────────────────────────────────────

interface PeriodPreset {
  label: string;
  value: string;
  getRange: () => { from: string; to: string };
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    from: `${year}-${String(startMonth).padStart(2, "0")}-01`,
    to: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`,
  };
}

function getPeriodPresets(): PeriodPreset[] {
  const year = getCurrentYear();
  const prevYear = year - 1;
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  return [
    {
      label: "Bez filtru",
      value: "none",
      getRange: () => ({ from: "", to: "" }),
    },
    {
      label: `Rok ${year}`,
      value: `year-${year}`,
      getRange: () => ({ from: `${year}-01-01`, to: `${year}-12-31` }),
    },
    {
      label: `Rok ${prevYear}`,
      value: `year-${prevYear}`,
      getRange: () => ({ from: `${prevYear}-01-01`, to: `${prevYear}-12-31` }),
    },
    {
      label: `Q${currentQuarter}/${year}`,
      value: `q${currentQuarter}-${year}`,
      getRange: () => getQuarterRange(year, currentQuarter),
    },
    ...(currentQuarter > 1
      ? [
          {
            label: `Q${currentQuarter - 1}/${year}`,
            value: `q${currentQuarter - 1}-${year}`,
            getRange: () => getQuarterRange(year, currentQuarter - 1),
          },
        ]
      : [
          {
            label: `Q4/${prevYear}`,
            value: `q4-${prevYear}`,
            getRange: () => getQuarterRange(prevYear, 4),
          },
        ]),
    {
      label: "Tento měsíc",
      value: "this-month",
      getRange: () => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return {
          from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
          to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`,
        };
      },
    },
    {
      label: "Minulý měsíc",
      value: "last-month",
      getRange: () => {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
        return {
          from: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`,
          to: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${lastDay}`,
        };
      },
    },
    {
      label: "Vlastní rozsah",
      value: "custom",
      getRange: () => ({ from: "", to: "" }),
    },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterBar({
  dateField = "datVyst",
  dateFieldLabel = "Datum vystavení",
  showAccountingPeriod = true,
  onFilterChange,
  className = "",
}: FilterBarProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const presets = getPeriodPresets();

  // Build Flexi filter expression from current state
  const buildFilter = useCallback(
    (from: string, to: string): FilterValues => {
      if (!from && !to) {
        return { filter: "", label: "Vše" };
      }

      const parts: string[] = [];
      if (from) {
        parts.push(`${dateField} >= '${from}'`);
      }
      if (to) {
        parts.push(`${dateField} <= '${to}'`);
      }
      const filter = parts.join(" and ");

      // Label
      let label = "";
      if (from && to) {
        label = `${dateFieldLabel}: ${from} – ${to}`;
      } else if (from) {
        label = `${dateFieldLabel} od: ${from}`;
      } else if (to) {
        label = `${dateFieldLabel} do: ${to}`;
      }

      return { filter, label };
    },
    [dateField, dateFieldLabel]
  );

  // Handle period preset change
  const handlePeriodChange = useCallback(
    (value: string) => {
      setSelectedPeriod(value);
      const preset = presets.find((p) => p.value === value);
      if (!preset || value === "custom") {
        // Keep existing custom dates
        return;
      }
      const range = preset.getRange();
      setDateFrom(range.from);
      setDateTo(range.to);
      onFilterChange(buildFilter(range.from, range.to));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFilterChange, buildFilter]
  );

  // Handle custom date changes
  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(value);
      setSelectedPeriod("custom");
      onFilterChange(buildFilter(value, dateTo));
    },
    [dateTo, onFilterChange, buildFilter]
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(value);
      setSelectedPeriod("custom");
      onFilterChange(buildFilter(dateFrom, value));
    },
    [dateFrom, onFilterChange, buildFilter]
  );

  // Clear filter
  const handleClear = useCallback(() => {
    setSelectedPeriod("none");
    setDateFrom("");
    setDateTo("");
    onFilterChange({ filter: "", label: "Vše" });
  }, [onFilterChange]);

  // Initialize
  useEffect(() => {
    onFilterChange({ filter: "", label: "Vše" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex flex-wrap items-end gap-4">
        {/* Period presets */}
        {showAccountingPeriod && (
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Účetní období
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[160px]"
            >
              {presets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date from */}
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {dateFieldLabel} od
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date to */}
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {dateFieldLabel} do
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Clear button */}
        {(dateFrom || dateTo) && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zrušit filtr
          </button>
        )}
      </div>

      {/* Active filter indicator */}
      {(dateFrom || dateTo) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
          Aktivní filtr: {dateFieldLabel}{" "}
          {dateFrom && dateTo
            ? `${dateFrom} – ${dateTo}`
            : dateFrom
            ? `od ${dateFrom}`
            : `do ${dateTo}`}
        </div>
      )}
    </div>
  );
}
