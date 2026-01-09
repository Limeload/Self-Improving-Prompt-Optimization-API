import { EvaluationResponse } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface EvaluationReportProps {
  evaluation: EvaluationResponse;
}

function MetricProgressBar({
  label,
  score,
  maxScore = 10,
  highlight = false,
}: {
  label: string;
  score: number;
  maxScore?: number;
  highlight?: boolean;
}) {
  const percentage = (score / maxScore) * 100;
  const displayScore = `${Math.round(score)}/${maxScore}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        <span className={`text-sm font-semibold ${highlight ? "text-blue-400" : "text-white"}`}>
          {displayScore}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          highlight && "[&>div]:bg-blue-500"
        )}
      />
    </div>
  );
}

export function EvaluationReport({ evaluation }: EvaluationReportProps) {
  const overallScore = Math.round((evaluation.overall_score || 0) * 10);
  const formatPassRate = Math.round((evaluation.format_pass_rate || 0) * 100);
  const failureCount = evaluation.failed_examples || 0;

  // Convert scores from 0-1 scale to 0-10 scale for display
  const correctnessScore = (evaluation.correctness_score || 0) * 10;
  const formatScore = (evaluation.format_score || 0) * 10;
  const verbosityScore = (evaluation.verbosity_score || 0) * 10;
  const safetyScore = (evaluation.safety_score || 0) * 10;
  const consistencyScore = (evaluation.consistency_score || 0) * 10;

  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "today";
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  return (
    <Card className="border-zinc-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-2xl mb-1">
              {evaluation.prompt_name}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-zinc-400 mt-2">
              <span>v{evaluation.prompt_version}</span>
              {evaluation.dataset_id && <span>• Code Review Test Cases</span>}
              <span>• {getTimeAgo(evaluation.created_at)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white mb-1">{overallScore}</div>
            <div className="text-sm text-zinc-400">Overall Score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics with Progress Bars */}
        <div className="space-y-4">
          <MetricProgressBar
            label="Correctness"
            score={correctnessScore}
            highlight={false}
          />
          <MetricProgressBar
            label="Format Adherence"
            score={formatScore}
            highlight={false}
          />
          <MetricProgressBar
            label="Verbosity"
            score={verbosityScore}
            highlight={false}
          />
          <MetricProgressBar
            label="Safety"
            score={safetyScore}
            highlight={true}
          />
          <MetricProgressBar
            label="Consistency"
            score={consistencyScore}
            highlight={false}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-zinc-400">Pass Rate</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatPassRate}%</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-zinc-400">Failure Cases</span>
            </div>
            <div className="text-2xl font-bold text-white">{failureCount}</div>
          </div>
        </div>

        {/* Failure Cases */}
        {evaluation.failure_cases && evaluation.failure_cases.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-lg font-semibold text-white mb-4">Failure Cases</h3>
            <div className="space-y-4">
              {evaluation.failure_cases.slice(0, 5).map((failureCase: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-red-950/20 border border-red-500/30 rounded-lg"
                >
                  {failureCase.reason && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-red-400">Reason:</span>
                      <p className="text-sm text-zinc-300 mt-1">{failureCase.reason}</p>
                    </div>
                  )}
                  {failureCase.expected && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Expected:</span>
                      <p className="text-sm text-zinc-300 mt-1">{failureCase.expected}</p>
                    </div>
                  )}
                  {failureCase.actual && (
                    <div>
                      <span className="text-xs font-semibold text-zinc-400">Actual:</span>
                      <p className="text-sm text-zinc-300 mt-1">{failureCase.actual}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

