"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, EvaluationRequest, EvaluationResponse, DatasetResponse, PromptResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { MetricBadge, EvaluationTable } from "@/components/prompts";
import { Play, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function EvaluatePageContent() {
  const searchParams = useSearchParams();
  const [promptName, setPromptName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
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

  const loadPrompts = async () => {
    try {
      setLoadingPrompts(true);
      const promptsList = await apiClient.prompts.list().catch(() => []);
      setPrompts(promptsList);
    } catch {
      // Silently fail
    } finally {
      setLoadingPrompts(false);
    }
  };

  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      const datasetsList = await apiClient.datasets.list().catch(() => []);
      setDatasets(datasetsList);
    } catch {
      // Silently fail - datasets endpoint may not exist yet
    } finally {
      setLoadingDatasets(false);
    }
  };

  const handleEvaluate = async () => {
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
      const request: EvaluationRequest = {
        dataset_id: datasetId ? parseInt(datasetId) : undefined,
        evaluation_dimensions: [
          "correctness",
          "format",
          "verbosity",
          "safety",
          "consistency",
        ],
      };
      const result = await apiClient.evaluations.evaluate(promptName, request);
      setEvaluation(result);
      toast({
        title: "Success",
        description: `Evaluation completed. Score: ${(result.overall_score || 0).toFixed(2)}`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to evaluate prompt";
      toast({
        title: "Error",
        description: errorMessage,
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

        <h1 className="mb-8 text-3xl font-bold text-white">Evaluate Prompt</h1>

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
                Select a prompt to evaluate
              </p>
            </div>
            <div>
              <Label htmlFor="datasetId" className="text-white">
                Dataset (optional)
              </Label>
              {loadingDatasets ? (
                <div className="mt-1 p-2 bg-zinc-800 text-zinc-400 rounded-md">
                  Loading datasets...
                </div>
              ) : datasets.length > 0 ? (
                <select
                  id="datasetId"
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                >
                  <option value="">No dataset (evaluate with default test cases)</option>
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
                    No datasets available. You can evaluate without a dataset, or create one first.
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Optional: Select a dataset to evaluate against. If not selected, default test cases will be used.
              </p>
            </div>
            <Button
              onClick={handleEvaluate}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? "Evaluating..." : "Evaluate"}
            </Button>
          </div>
        </Card>

        {evaluation && (
          <div className="space-y-6">
            {/* Summary Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Evaluation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <MetricBadge
                    label="Overall Score"
                    value={evaluation.overall_score || 0}
                    variant={
                      (evaluation.overall_score || 0) >= 0.8
                        ? "success"
                        : (evaluation.overall_score || 0) >= 0.6
                        ? "warning"
                        : "danger"
                    }
                  />
                  <MetricBadge
                    label="Correctness"
                    value={evaluation.correctness_score || 0}
                    variant="default"
                  />
                  <MetricBadge
                    label="Format"
                    value={evaluation.format_score || 0}
                    variant="default"
                  />
                  <MetricBadge
                    label="Verbosity"
                    value={evaluation.verbosity_score || 0}
                    variant="default"
                  />
                  <MetricBadge
                    label="Safety"
                    value={evaluation.safety_score || 0}
                    variant="default"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Total Examples</p>
                    <p className="text-xl font-bold text-white">{evaluation.total_examples}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Passed</p>
                    <p className="text-xl font-bold text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {evaluation.passed_examples}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Failed</p>
                    <p className="text-xl font-bold text-red-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {evaluation.failed_examples}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Format Pass Rate</p>
                    <p className="text-xl font-bold text-white">
                      {((evaluation.format_pass_rate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results Table */}
            {evaluation.results && evaluation.results.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Per-Example Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <EvaluationTable results={evaluation.results} showDetails />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Per-Example Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 text-center py-4">
                    No detailed results available. The evaluation may not have included per-example results.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Failure Cases */}
            {evaluation.failure_cases && evaluation.failure_cases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Failure Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {evaluation.failure_cases.slice(0, 10).map((failureCase, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-red-950/20 border border-red-500/30 rounded"
                      >
                        <pre className="text-xs font-mono text-zinc-300 overflow-x-auto">
                          {JSON.stringify(failureCase, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {evaluation.failure_cases.length > 10 && (
                      <p className="text-sm text-zinc-400 text-center">
                        ... and {evaluation.failure_cases.length - 10} more failure cases
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              <span className="ml-2 text-zinc-400">Loading...</span>
            </div>
          </Card>
        </div>
      </div>
    }>
      <EvaluatePageContent />
    </Suspense>
  );
}

