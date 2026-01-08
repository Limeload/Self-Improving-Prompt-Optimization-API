import { cn } from "@/lib/utils";

export type PromptStatus = "draft" | "active" | "archived";

interface StatusPillProps {
  status: PromptStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const statusConfig = {
    active: {
      label: "Active",
      className: "bg-green-500/20 text-green-400 border-green-500/50",
    },
    draft: {
      label: "Draft",
      className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    },
    archived: {
      label: "Archived",
      className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

