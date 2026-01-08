import { ImprovementResponse } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface PromotionDecisionBannerProps {
  improvement: ImprovementResponse;
}

export function PromotionDecisionBanner({ improvement }: PromotionDecisionBannerProps) {
  const decision = improvement.promotion_decision;
  const isPromoted = decision === "promoted";
  const isRejected = decision === "rejected";
  const isPending = decision === "pending";

  const decisionConfig = {
    promoted: {
      icon: CheckCircle2,
      bgColor: "bg-green-950/30",
      borderColor: "border-green-500/50",
      iconColor: "text-green-400",
      titleColor: "text-green-400",
      title: "Promoted",
    },
    rejected: {
      icon: XCircle,
      bgColor: "bg-red-950/30",
      borderColor: "border-red-500/50",
      iconColor: "text-red-400",
      titleColor: "text-red-400",
      title: "Rejected",
    },
    pending: {
      icon: Clock,
      bgColor: "bg-yellow-950/30",
      borderColor: "border-yellow-500/50",
      iconColor: "text-yellow-400",
      titleColor: "text-yellow-400",
      title: "Pending Review",
    },
  };

  const config = decisionConfig[decision as keyof typeof decisionConfig] || decisionConfig.pending;
  const Icon = config.icon;

  const improvementDelta = improvement.improvement_delta || 0;
  const hasImprovement = improvementDelta > 0;

  return (
    <Card className={`p-6 ${config.bgColor} ${config.borderColor} border-2`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
          <div>
            <h3 className={`text-xl font-bold ${config.titleColor}`}>{config.title}</h3>
            <p className="text-sm text-zinc-400">
              {improvement.baseline_version} →{" "}
              {improvement.best_candidate_version || "N/A"}
            </p>
          </div>
        </div>

        {/* Metrics Comparison */}
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Baseline Score</p>
            <p className="text-2xl font-bold text-white">
              {(improvement.baseline_score || 0).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-500">v{improvement.baseline_version}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Best Candidate Score</p>
            <p className="text-2xl font-bold text-green-400">
              {(improvement.best_candidate_score || 0).toFixed(2)}
            </p>
            {improvement.best_candidate_version && (
              <p className="text-xs text-zinc-500">v{improvement.best_candidate_version}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Improvement Delta</p>
            <div className="flex items-center gap-2">
              {hasImprovement ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )}
              <p
                className={`text-2xl font-bold ${
                  hasImprovement ? "text-green-400" : "text-red-400"
                }`}
              >
                {hasImprovement ? "+" : ""}
                {(improvementDelta * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="pt-4 border-t border-zinc-800">
          <p className="text-sm font-semibold text-zinc-300 mb-2">Decision Rationale</p>
          <p className="text-sm text-zinc-400 leading-relaxed">{improvement.promotion_reason}</p>
        </div>

        {/* Stats */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex gap-6 text-sm text-zinc-400">
            <div>
              <span className="font-semibold text-white">
                {improvement.candidates_generated}
              </span>{" "}
              candidates generated
            </div>
            <div>
              <span className="font-semibold text-white">
                {improvement.candidates_evaluated}
              </span>{" "}
              candidates evaluated
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

