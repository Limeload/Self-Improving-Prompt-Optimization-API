"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, ImprovementRequest, ImprovementResponse, DatasetResponse, PromptDiffResponse, PromptResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { PromotionDecisionBanner, DiffViewer } from "@/components/prompts";
import { TrendingUp, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ImprovePage() {
  const searchParams = useSearchParams();
  const [promptName, setPromptName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [improvement, setImprovement] = useState<ImprovementResponse | null>(null);
  const [diff, setDiff] = useState<PromptDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      // Decode the prompt name from URL search params
      setPromptName(decodeURIComponent(promptParam));
    }
    loadPrompts();
    loadDatasets();
  }, [searchParams]);

  useEffect(() => {
    if (improvement?.baseline_prompt_id && improvement?.best_candidate_id) {
      loadDiff();
    }
  }, [improvement]);

  const loadPrompts = async () => {
    try {
      setLoadingPrompts(true);
      const promptsList = await apiClient.prompts.list().catch(() => []);
      setPrompts(promptsList);
    } catch (error) {
      // Silently fail
    } finally {
      setLoadingPrompts(false);
    }
  };

  const loadDatasets = async () => {
    try {
      const datasetsList = await apiClient.datasets.list().catch(() => []);
      setDatasets(datasetsList);
    } catch (error) {
      // Silently fail
    }
  };

  const loadDiff = async () => {
    if (!improvement?.baseline_prompt_id || !improvement?.best_candidate_id) return;
    
    try {
      setLoadingDiff(true);
      const diffData = await apiClient.prompts.getDiff(
        improvement.baseline_prompt_id,
        improvement.best_candidate_id
      );
      setDiff(diffData);
    } catch (error: any) {
      // Silently fail - diff may not be available
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleImprove = async () => {
    if (!promptName) {
      toast({
        title: "Error",
        description: "Please enter a prompt name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const request: ImprovementRequest = {
        dataset_id: datasetId ? parseInt(datasetId) : undefined,
        improvement_threshold: 0.05,
        max_candidates: 3,
      };
      const result = await apiClient.evaluations.improve(promptName, request);
      setImprovement(result);
      toast({
        title: "Success",
        description: `Improvement process completed. Decision: ${result.promotion_decision}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to improve prompt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/prompts"
          className="mb-6 inline-flex items-center text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Prompts
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-white">Improve Prompt</h1>

        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="promptName" className="text-white">
                Prompt *
              </Label>
              {loadingPrompts ? (
                <div className="mt-1 p-2 bg-zinc-800 text-zinc-400 rounded-md">
                  Loading prompts...
                </div>
              ) : prompts.length > 0 ? (
                <select
                  id="promptName"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                  required
                >
                  <option value="">Select a prompt...</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.name}>
                      {prompt.name} (v{prompt.version}) - {prompt.status}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="promptName"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder="e.g., sentiment_analyzer"
                  className="mt-1 bg-zinc-800 text-white"
                  required
                />
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Select a prompt to improve
              </p>
            </div>
            <div>
              <Label htmlFor="datasetId" className="text-white">
                Dataset (optional)
              </Label>
              {datasets.length > 0 ? (
                <select
                  id="datasetId"
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                >
                  <option value="">No dataset (use default test cases)</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id.toString()}>
                      {dataset.name} ({dataset.entry_count} entries)
                      {dataset.description && ` - ${dataset.description}`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 p-3 bg-zinc-900/50 border border-zinc-800 rounded-md">
                  <p className="text-sm text-zinc-400">
                    No datasets available. You can improve without a dataset, or create one first.
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Optional: Select a dataset to evaluate against. If not selected, default test cases will be used.
              </p>
            </div>
            <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> This will generate candidate prompts, evaluate them against the dataset,
                and automatically promote the best candidate if it meets the improvement threshold.
              </p>
            </div>
            <Button
              onClick={handleImprove}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {loading ? "Improving..." : "Start Improvement"}
            </Button>
          </div>
        </Card>

        {improvement && (
          <div className="space-y-6">
            {/* Improvement Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Improvement Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-400 mb-2">Baseline</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-white">
                        Version: <span className="text-zinc-400">{improvement.baseline_version}</span>
                      </p>
                      {improvement.baseline_score !== undefined && (
                        <p className="text-sm text-white">
                          Score: <span className="text-zinc-400">{improvement.baseline_score.toFixed(3)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {improvement.best_candidate_id && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-400 mb-2">Best Candidate</h4>
                      <div className="space-y-2">
                        {improvement.best_candidate_version && (
                          <p className="text-sm text-white">
                            Version: <span className="text-zinc-400">{improvement.best_candidate_version}</span>
                          </p>
                        )}
                        {improvement.best_candidate_score !== undefined && (
                          <p className="text-sm text-white">
                            Score: <span className="text-zinc-400">{improvement.best_candidate_score.toFixed(3)}</span>
                          </p>
                        )}
                        {improvement.improvement_delta !== undefined && (
                          <p className="text-sm text-white">
                            Improvement: <span className={improvement.improvement_delta > 0 ? "text-green-400" : "text-red-400"}>
                              {improvement.improvement_delta > 0 ? "+" : ""}{improvement.improvement_delta.toFixed(3)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-400 mb-2">Candidates</h4>
                    <p className="text-sm text-white">
                      Generated: <span className="text-zinc-400">{improvement.candidates_generated}</span>
                    </p>
                    <p className="text-sm text-white">
                      Evaluated: <span className="text-zinc-400">{improvement.candidates_evaluated}</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-400 mb-2">Decision</h4>
                    <p className="text-sm text-white">
                      Status: <span className="text-zinc-400">{improvement.promotion_decision}</span>
                    </p>
                    {improvement.promotion_reason && (
                      <p className="text-sm text-zinc-400 mt-2">{improvement.promotion_reason}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Promotion Decision Banner */}
            <PromotionDecisionBanner improvement={improvement} />

            {/* Diff Viewer */}
            {improvement.best_candidate_id && improvement.baseline_prompt_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Version Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDiff ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                      <span className="ml-2 text-zinc-400">Loading diff...</span>
                    </div>
                  ) : diff ? (
                    <DiffViewer diff={diff} />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-zinc-400">
                        Diff not available. Versions may have been deleted or diff endpoint unavailable.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {improvement.promotion_decision === "promoted" && (
                    <Link href={`/prompts/${encodeURIComponent(promptName)}`}>
                      <Button variant="outline">
                        View Updated Prompt
                      </Button>
                    </Link>
                  )}
                  <Link href={`/prompts/${encodeURIComponent(promptName)}`}>
                    <Button variant="outline">
                      View Prompt Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImprovement(null);
                      setDiff(null);
                    }}
                  >
                    Run Another Improvement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

