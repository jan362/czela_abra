import { FlexiApiError, FlexiNotFoundError } from "./flexi-errors";
import type { FlexiEnvelope, FlexiWriteResult } from "./flexi-types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface FlexiConfig {
  baseUrl: string;
  company: string;
  username: string;
  password: string;
  format?: "json" | "xml";
}

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export interface FlexiQueryOptions {
  /** Flexi filter expression, e.g., "datVyst > '2024-01-01'" */
  filter?: string;
  /** Detail level */
  detail?: "id" | "summary" | "full" | string;
  /** Max records to return */
  limit?: number;
  /** Offset for pagination */
  start?: number;
  /** Sort expression, e.g., "datVyst@D" */
  order?: string;
  /** Sub-records to include, e.g., ["polozky", "prilohy"] */
  relations?: string[];
  /** Include total row count in response */
  addRowCount?: boolean;
  /** Validate without saving */
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// FlexiClient
// ---------------------------------------------------------------------------

export class FlexiClient {
  private config: FlexiConfig;
  private authHeader: string;

  constructor(config: FlexiConfig) {
    this.config = config;
    this.authHeader =
      "Basic " +
      Buffer.from(`${config.username}:${config.password}`).toString("base64");
  }

  // -------------------------------------------------------------------------
  // URL builder
  // -------------------------------------------------------------------------

  private buildUrl(
    evidence: string,
    id?: string | number,
    options?: FlexiQueryOptions
  ): string {
    const format = this.config.format ?? "json";
    let path = `/c/${this.config.company}/${evidence}`;

    if (options?.filter) {
      path += `/(${options.filter})`;
    }

    if (id !== undefined) {
      path += `/${id}`;
    }

    path += `.${format}`;

    const params = new URLSearchParams();
    if (options?.detail) params.set("detail", options.detail);
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    if (options?.start !== undefined) params.set("start", String(options.start));
    if (options?.order) params.set("order", options.order);
    if (options?.relations?.length) {
      params.set("relations", options.relations.join(","));
    }
    if (options?.addRowCount) params.set("add-row-count", "true");
    if (options?.dryRun) params.set("dry-run", "true");

    const qs = params.toString();
    return `${this.config.baseUrl}${path}${qs ? "?" + qs : ""}`;
  }

  // -------------------------------------------------------------------------
  // Core request method
  // -------------------------------------------------------------------------

  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new FlexiApiError(
        response.status,
        response.statusText,
        errorBody,
        url
      );
    }

    return response.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** List records from an evidence. */
  async list<T = Record<string, unknown>>(
    evidence: string,
    options?: FlexiQueryOptions
  ): Promise<{ rows: T[]; rowCount?: number }> {
    const url = this.buildUrl(evidence, undefined, options);
    const data = await this.request<FlexiEnvelope<T>>("GET", url);
    const rows = (data.winstrom[evidence] as T[] | undefined) ?? [];
    const rowCount = data.winstrom["@rowCount"]
      ? Number(data.winstrom["@rowCount"])
      : undefined;
    return { rows, rowCount };
  }

  /** Get a single record by ID or code. */
  async get<T = Record<string, unknown>>(
    evidence: string,
    id: string | number,
    options?: Pick<FlexiQueryOptions, "detail" | "relations">
  ): Promise<T> {
    const url = this.buildUrl(evidence, id, options);
    const data = await this.request<FlexiEnvelope<T>>("GET", url);
    const records = data.winstrom[evidence] as T[] | undefined;
    if (!records || !records[0]) {
      throw new FlexiNotFoundError(evidence, id);
    }
    return records[0];
  }

  /** Create one or more records. */
  async create<T = Record<string, unknown>>(
    evidence: string,
    records: Partial<T> | Partial<T>[],
    options?: Pick<FlexiQueryOptions, "dryRun">
  ): Promise<FlexiWriteResult> {
    const url = this.buildUrl(evidence, undefined, options);
    const body = {
      winstrom: {
        [evidence]: Array.isArray(records) ? records : [records],
      },
    };
    return this.request<FlexiWriteResult>("POST", url, body);
  }

  /** Update an existing record. */
  async update<T = Record<string, unknown>>(
    evidence: string,
    id: string | number,
    data: Partial<T>,
    options?: Pick<FlexiQueryOptions, "dryRun">
  ): Promise<FlexiWriteResult> {
    const url = this.buildUrl(evidence, id, options);
    const body = {
      winstrom: {
        [evidence]: [{ ...data, id }],
      },
    };
    return this.request<FlexiWriteResult>("PUT", url, body);
  }

  /** Delete a record. */
  async delete(evidence: string, id: string | number): Promise<void> {
    const url = this.buildUrl(evidence, id);
    await this.request<unknown>("DELETE", url);
  }

  /** Test connection to the Flexi server. */
  async testConnection(): Promise<{
    ok: boolean;
    version?: string;
    company?: string;
    error?: string;
  }> {
    try {
      const url = `${this.config.baseUrl}/c/${this.config.company}/evidence-list.json`;
      const data = await this.request<Record<string, unknown>>("GET", url);
      return {
        ok: true,
        version: (data as Record<string, Record<string, string>>)?.winstrom?.["@version"],
        company: this.config.company,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /** Get aggregation/summary for an evidence. */
  async sum(
    evidence: string,
    filter?: string
  ): Promise<Record<string, unknown>> {
    let path = `/c/${this.config.company}/${evidence}`;
    if (filter) path += `/(${filter})`;
    path += "/$sum.json";
    const url = `${this.config.baseUrl}${path}`;
    return this.request<Record<string, unknown>>("GET", url);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: FlexiClient | null = null;

/**
 * Returns a singleton FlexiClient instance.
 * Reads configuration from environment variables.
 * This function should ONLY be called on the server side.
 */
export function getFlexiClient(): FlexiClient {
  if (!_instance) {
    const baseUrl = process.env.FLEXI_BASE_URL;
    const company = process.env.FLEXI_COMPANY;
    const username = process.env.FLEXI_USERNAME;
    const password = process.env.FLEXI_PASSWORD;

    if (!baseUrl || !company || !username || !password) {
      throw new Error(
        "Missing FLEXI_* environment variables. " +
          "Check .env.local against .env.example."
      );
    }

    _instance = new FlexiClient({ baseUrl, company, username, password });
  }
  return _instance;
}
