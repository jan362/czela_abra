/**
 * Common formatters for DataTable columns and display.
 */

/** Format Flexi date string (e.g., "2024-08-05+02:00") to "2024-08-05" */
export function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  return value.split("+")[0].split("T")[0];
}

/** Format number as CZK currency */
export function formatCurrency(value: unknown): string {
  if (value == null) return "";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Format payment status (stavUhrK) to Czech label */
export function formatPaymentStatus(value: unknown): string {
  if (!value || typeof value !== "string") return "Neuhrazeno";
  const map: Record<string, string> = {
    "stavUhr.uhrazeno": "Uhrazeno",
    "stavUhr.castUhr": "Částečně",
    "stavUhr.neuhrazeno": "Neuhrazeno",
  };
  return map[value] || value;
}

/** Format firma reference — extract showAs from full string like "code:MARTIN" */
export function formatFirma(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  // Remove "code:" prefix if present
  return value.replace(/^code:/, "");
}

/** Format boolean-like values */
export function formatBoolean(value: unknown): string {
  if (value === "true" || value === true) return "Ano";
  if (value === "false" || value === false) return "Ne";
  return String(value ?? "");
}
