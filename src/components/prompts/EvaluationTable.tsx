import { EvaluationResultResponse } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

interface EvaluationTableProps {
  results: EvaluationResultResponse[];
  showDetails?: boolean;
}

export function EvaluationTable({ results, showDetails = false }: EvaluationTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const getScoreColor = (score?: number) => {
    if (score === undefined) return "text-zinc-400";
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Status</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Overall</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Correctness</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Format</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Verbosity</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Safety</th>
              <th className="text-left p-3 text-xs font-semibold text-zinc-400">Consistency</th>
              {showDetails && (
                <th className="text-left p-3 text-xs font-semibold text-zinc-400">Details</th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <>
                <tr
                  key={result.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}
                >
                  <td className="p-3">
                    {result.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </td>
                  <td className={`p-3 font-medium ${getScoreColor(result.overall_score)}`}>
                    {result.overall_score?.toFixed(2) ?? "—"}
                  </td>
                  <td className={`p-3 ${getScoreColor(result.correctness_score)}`}>
                    {result.correctness_score?.toFixed(2) ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={getScoreColor(result.format_score)}>
                        {result.format_score?.toFixed(2) ?? "—"}
                      </span>
                      {result.passed_format_validation ? (
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  </td>
                  <td className={`p-3 ${getScoreColor(result.verbosity_score)}`}>
                    {result.verbosity_score?.toFixed(2) ?? "—"}
                  </td>
                  <td className={`p-3 ${getScoreColor(result.safety_score)}`}>
                    {result.safety_score?.toFixed(2) ?? "—"}
                  </td>
                  <td className={`p-3 ${getScoreColor(result.consistency_score)}`}>
                    {result.consistency_score?.toFixed(2) ?? "—"}
                  </td>
                  {showDetails && (
                    <td className="p-3 text-xs text-zinc-400">
                      {expandedRow === result.id ? "▼" : "▶"}
                    </td>
                  )}
                </tr>
                {expandedRow === result.id && showDetails && (
                  <tr>
                    <td colSpan={8} className="p-4 bg-zinc-900/30">
                      <Card className="p-4 bg-zinc-950">
                        <div className="space-y-4">
                          {/* Input/Output */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Input</h4>
                              <pre className="text-xs font-mono text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.input_data, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Output</h4>
                              <pre className="text-xs font-mono text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.actual_output || {}, null, 2)}
                              </pre>
                            </div>
                          </div>

                          {/* Failure reason */}
                          {result.failure_reason && (
                            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded">
                              <h4 className="text-xs font-semibold text-red-400 mb-1">
                                Failure Reason
                              </h4>
                              <p className="text-xs text-red-300">{result.failure_reason}</p>
                            </div>
                          )}

                          {/* Format validation error */}
                          {result.format_validation_error && (
                            <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 rounded">
                              <h4 className="text-xs font-semibold text-yellow-400 mb-1">
                                Format Error
                              </h4>
                              <p className="text-xs text-yellow-300">
                                {result.format_validation_error}
                              </p>
                            </div>
                          )}

                          {/* Judge feedback */}
                          {result.judge_feedback && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-400 mb-1">
                                Judge Feedback
                              </h4>
                              <p className="text-xs text-zinc-300">{result.judge_feedback}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

