import type { BillingSource } from "@/api/hooks/types";

const BILLING_CONFIG: Record<
  BillingSource,
  { label: string; color: string; title: string }
> = {
  api: {
    label: "API",
    color: "#10b981",
    title: "Direct API key — billed per token",
  },
  max: {
    label: "Max",
    color: "#8b5cf6",
    title: "Claude Max subscription",
  },
  pro: {
    label: "Pro",
    color: "#6366f1",
    title: "Claude Pro subscription",
  },
  free: {
    label: "Free",
    color: "#f59e0b",
    title: "Free tier",
  },
  unknown: {
    label: "—",
    color: "#64748b",
    title: "Billing source unknown",
  },
};

interface BillingBadgeProps {
  source: BillingSource;
  className?: string;
}

export function BillingBadge({ source, className }: BillingBadgeProps) {
  const cfg = BILLING_CONFIG[source] ?? BILLING_CONFIG.unknown;

  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{
        backgroundColor: `${cfg.color}22`,
        color: cfg.color,
        border: `1px solid ${cfg.color}44`,
      }}
    >
      {cfg.label}
    </span>
  );
}
