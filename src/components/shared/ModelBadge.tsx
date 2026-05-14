import { MODEL_COLORS, MODEL_SHORT } from "@/lib/constants";

interface ModelBadgeProps {
  model: string;
  className?: string;
}

export function ModelBadge({ model, className }: ModelBadgeProps) {
  const color = MODEL_COLORS[model] ?? MODEL_COLORS.unknown;
  const label = MODEL_SHORT[model] ?? model.split("-").slice(1, 3).join(" ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}
