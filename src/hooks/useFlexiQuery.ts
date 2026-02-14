"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFlexiQueryOptions {
  evidence: string;
  filter?: string;
  detail?: string;
  limit?: number;
  start?: number;
  order?: string;
  enabled?: boolean;
}

interface UseFlexiQueryResult<T> {
  data: T[];
  rowCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Client-side hook for fetching data from the Flexi API proxy.
 * Calls /api/flexi/{evidence} with query parameters.
 */
export function useFlexiQuery<T = Record<string, unknown>>(
  options: UseFlexiQueryOptions
): UseFlexiQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (options.enabled === false) return;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (options.filter) params.set("filter", options.filter);
    if (options.detail) params.set("detail", options.detail);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.start) params.set("start", String(options.start));
    if (options.order) params.set("order", options.order);

    try {
      const res = await fetch(
        `/api/flexi/${options.evidence}?${params.toString()}`
      );
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setData(result.rows ?? []);
      setRowCount(result.rowCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setIsLoading(false);
    }
  }, [
    options.evidence,
    options.filter,
    options.detail,
    options.limit,
    options.start,
    options.order,
    options.enabled,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, rowCount, isLoading, error, refetch: fetchData };
}
