import { cn } from "@/lib/utils";

interface MetricBadgeProps {
  label: string;
  value: number | string;
  unit?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

export function MetricBadge({
  label,
  value,
  unit,
  variant = "default",
  className,
}: MetricBadgeProps) {
  const variantStyles = {
    default: "text-white",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-xs text-zinc-400 mb-1">{label}</span>
      <span className={cn("text-2xl font-bold", variantStyles[variant])}>
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit && <span className="text-sm ml-1">{unit}</span>}
      </span>
    </div>
  );
}

