import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./StatusPill";
import { PromptResponse, PromptVersionResponse } from "@/lib/api-client";
import { ArrowRight, Link2, Clock, Trash2 } from "lucide-react";

interface PromptCardProps {
  prompt: PromptResponse;
  versionCount?: number;
  lastEvaluationScore?: number;
  lastPromotionDecision?: "promoted" | "rejected" | "pending";
  onDelete?: (prompt: PromptResponse) => void;
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  const years = Math.floor(diffInDays / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function PromptCard({
  prompt,
  versionCount,
  lastEvaluationScore,
  lastPromotionDecision,
  onDelete,
}: PromptCardProps) {
  const metadata = prompt.metadata || {};
  const model = metadata.model || "gpt-4";
  const temperature = metadata.temperature !== undefined ? metadata.temperature : null;
  const task = metadata.task || "general";

  // Generate description from template text
  const description = prompt.template_text
    .substring(0, 80)
    .replace(/\{\{[^}]+\}\}/g, "...")
    .trim() + "...";

  return (
    <Card className="p-6 hover:bg-white/[0.05] transition-colors border-zinc-800">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-white text-lg">{prompt.name}</h3>
              <StatusPill status={prompt.status} />
            </div>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 flex-shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${prompt.name}" v${prompt.version}?`)) {
                  onDelete(prompt);
                }
              }}
              title="Delete prompt"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Version Info */}
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          {versionCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <Link2 className="h-4 w-4" />
              <span>{versionCount} {versionCount === 1 ? "version" : "versions"}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{getTimeAgo(prompt.updated_at)}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 rounded">
            {model}
          </span>
          {temperature !== null && (
            <span className="px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 rounded">
              temp: {temperature}
            </span>
          )}
          <span className="px-2 py-1 text-xs font-medium bg-purple-950/50 text-purple-300 rounded border border-purple-800/50">
            {task}
          </span>
        </div>

        {/* Action */}
        <Link href={`/prompts/${encodeURIComponent(prompt.name)}`} className="block">
          <Button variant="outline" size="sm" className="w-full group">
            View Details
            <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

