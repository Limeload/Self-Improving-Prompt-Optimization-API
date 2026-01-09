import { ImprovementResponse, PromptDiffResponse } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, ArrowRight, Clock as ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PromotionDecisionBannerProps {
  improvement: ImprovementResponse;
  promptName?: string;
  diff?: PromptDiffResponse | null;
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "1 day ago";
  return `${diffInDays} days ago`;
}

function extractChangesFromDiff(diff: PromptDiffResponse | null): string[] {
  if (!diff) return [];
  
  const changes: string[] = [];
  const seen = new Set<string>();
  
  // Extract meaningful changes from added lines
  diff.added_lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 15 && !seen.has(trimmed)) {
      // Look for key phrases that indicate meaningful changes
      const lower = trimmed.toLowerCase();
      if (lower.includes("require") || 
          lower.includes("must") ||
          lower.includes("should") ||
          lower.includes("mandatory") ||
          lower.includes("explicit") ||
          lower.includes("added") ||
          lower.includes("include") ||
          lower.includes("reference") ||
          lower.includes("field") ||
          lower.includes("suggestion")) {
        // Clean up the line - remove markdown, extra whitespace
        let clean = trimmed
          .replace(/^[-+*]\s*/, '') // Remove diff markers
          .replace(/^#+\s*/, '') // Remove markdown headers
          .trim();
        
        if (clean.length > 10 && clean.length < 100) {
          changes.push(clean);
          seen.add(trimmed);
        }
      }
    }
  });
  
  // If we don't have enough changes, add some generic ones from added lines
  if (changes.length < 3 && diff.added_lines.length > 0) {
    diff.added_lines.slice(0, 5).forEach((line) => {
      const trimmed = line.trim().replace(/^[-+*]\s*/, '').trim();
      if (trimmed && trimmed.length > 15 && trimmed.length < 100 && !seen.has(line)) {
        changes.push(trimmed);
        seen.add(line);
      }
    });
  }
  
  return changes.slice(0, 5); // Limit to 5 changes
}

export function PromotionDecisionBanner({ 
  improvement, 
  promptName,
  diff 
}: PromotionDecisionBannerProps) {
  const decision = improvement.promotion_decision;
  const isPromoted = decision === "promoted";
  
  // Calculate scores out of 100
  const baselineScore = Math.round((improvement.baseline_score || 0) * 100);
  const candidateScore = Math.round((improvement.best_candidate_score || 0) * 100);
  const improvementPoints = candidateScore - baselineScore;
  const improvementPercent = improvement.improvement_delta 
    ? (improvement.improvement_delta * 100).toFixed(1)
    : "0.0";
  
  // Extract changes from diff if available
  const changes = diff ? extractChangesFromDiff(diff) : [];
  const hasMoreChanges = diff && diff.added_lines.length > changes.length;

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-zinc-200 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">
              {promptName || "Prompt"}
            </h3>
            {isPromoted && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Promoted
              </div>
            )}
          </div>
        </div>

        {/* Version Badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm font-medium">
            v{improvement.baseline_version}
          </span>
          <ArrowRight className="h-4 w-4 text-zinc-400" />
          <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm font-medium">
            v{improvement.best_candidate_version || "N/A"}
          </span>
        </div>

        {/* Baseline and Candidate Scores */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-600 mb-2">Baseline</p>
            <div className="text-3xl font-bold text-zinc-900 mb-2">
              {baselineScore}/100
            </div>
            <Progress 
              value={baselineScore} 
              className="h-2 [&>div]:bg-orange-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-600 mb-2">Candidate</p>
            <div className="text-3xl font-bold text-zinc-900 mb-2">
              {candidateScore}/100
            </div>
            <Progress 
              value={candidateScore} 
              className="h-2 [&>div]:bg-green-500"
            />
          </div>
        </div>

        {/* Improvement */}
        {improvementPoints > 0 && (
          <div className="text-green-600 font-semibold">
            ↑ {improvementPoints} points (+{improvementPercent}%)
          </div>
        )}

        {/* Changes */}
        {changes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 mb-3">Changes:</h4>
            <ul className="space-y-2">
              {changes.map((change, idx) => (
                <li key={idx} className="text-sm text-zinc-700 flex items-start">
                  <span className="mr-2 text-zinc-400">•</span>
                  <span>{change}</span>
                </li>
              ))}
              {hasMoreChanges && (
                <li className="text-sm text-zinc-500 flex items-start">
                  <span className="mr-2">•</span>
                  <span>+{diff!.added_lines.length - changes.length} more changes</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <ClockIcon className="h-4 w-4" />
            <span>{getTimeAgo(improvement.created_at)}</span>
          </div>
          {promptName && (
            <Link href={`/prompts/${encodeURIComponent(promptName)}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

