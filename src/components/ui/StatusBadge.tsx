"use client";

interface Props {
  status: string;
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "stavUhr.uhrazeno": "bg-green-100 text-green-800",
  "stavUhr.castUhr": "bg-yellow-100 text-yellow-800",
  "stavUhr.neuhrazeno": "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  "stavUhr.uhrazeno": "Uhrazeno",
  "stavUhr.castUhr": "Částečně",
  "stavUhr.neuhrazeno": "Neuhrazeno",
};

export function StatusBadge({ status, label }: Props) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {displayLabel}
    </span>
  );
}
