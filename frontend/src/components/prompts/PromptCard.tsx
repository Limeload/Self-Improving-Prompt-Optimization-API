import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./StatusPill";
import { MetricBadge } from "./MetricBadge";
import { PromptResponse } from "@/lib/api-client";
import { Eye, Play, Trash2 } from "lucide-react";

interface PromptCardProps {
  prompt: PromptResponse;
  lastEvaluationScore?: number;
  lastPromotionDecision?: "promoted" | "rejected" | "pending";
  onDelete?: (prompt: PromptResponse) => void;
}

export function PromptCard({
  prompt,
  lastEvaluationScore,
  lastPromotionDecision,
  onDelete,
}: PromptCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Are you sure you want to delete "${prompt.name}" v${prompt.version}?`)) {
      onDelete(prompt);
    }
  };
  return (
    <Card className="p-6 hover:bg-white/[0.05] transition-colors">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white text-lg">{prompt.name}</h3>
              <StatusPill status={prompt.status} />
            </div>
            <p className="text-sm text-zinc-400">v{prompt.version}</p>
          </div>
        </div>

        {/* Preview */}
        <p className="text-sm text-zinc-400 line-clamp-2">
          {prompt.template_text.substring(0, 120)}
          {prompt.template_text.length > 120 ? "..." : ""}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
          {lastEvaluationScore !== undefined && (
            <MetricBadge
              label="Last Score"
              value={lastEvaluationScore}
              variant={lastEvaluationScore >= 0.8 ? "success" : lastEvaluationScore >= 0.6 ? "warning" : "danger"}
            />
          )}
          {lastPromotionDecision && (
            <div className="flex flex-col">
              <span className="text-xs text-zinc-400 mb-1">Last Promotion</span>
              <span
                className={`text-sm font-medium ${
                  lastPromotionDecision === "promoted"
                    ? "text-green-400"
                    : lastPromotionDecision === "rejected"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {lastPromotionDecision.charAt(0).toUpperCase() + lastPromotionDecision.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link href={`/prompts/${encodeURIComponent(prompt.name)}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="mr-2 h-3 w-3" />
              View Details
            </Button>
          </Link>
          <Link href={`/prompts/${encodeURIComponent(prompt.name)}/run`}>
            <Button variant="outline" size="sm">
              <Play className="h-3 w-3" />
            </Button>
          </Link>
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:border-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          Created {new Date(prompt.created_at).toLocaleDateString()}
        </div>
      </div>
    </Card>
  );
}

