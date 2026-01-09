"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, EvaluationRequest, EvaluationResponse, DatasetResponse, PromptResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { MetricBadge, EvaluationTable, EvaluationReport } from "@/components/prompts";
import { Play, ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, Plus } from "lucide-react";
import Link from "next/link";

function EvaluatePageContent() {
  const searchParams = useSearchParams();
  const [promptName, setPromptName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string;
    metadata: Record<string, unknown>;
    entry_count: number;
  }>>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      // Decode the prompt name from URL search params
      setPromptName(decodeURIComponent(promptParam));
    }
    loadPrompts();
    loadDatasets();
    loadTemplates();
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

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const templatesList = await apiClient.datasets.listTemplates().catch(() => []);
      setTemplates(templatesList);
    } catch {
      // Silently fail
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string, templateName: string) => {
    try {
      setLoadingDatasets(true);
      const dataset = await apiClient.datasets.createFromTemplate(templateId);
      toast({
        title: "Success",
        description: `Dataset "${dataset.name}" created from template`,
      });
      setShowTemplates(false);
      await loadDatasets();
      setDatasetId(dataset.id.toString());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create dataset from template";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="datasetId" className="text-white">
                  Dataset (optional)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {showTemplates ? "Hide Templates" : "Use Template"}
                </Button>
              </div>
              
              {showTemplates && (
                <Card className="mb-4 p-4 bg-purple-950/20 border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Quick Create from Template</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplates(false)}
                      className="text-zinc-400"
                    >
                      ×
                    </Button>
                  </div>
                  {loadingTemplates ? (
                    <p className="text-sm text-zinc-400">Loading templates...</p>
                  ) : templates.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {templates.map((template) => (
                        <Button
                          key={template.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateFromTemplate(template.id, template.name)}
                          disabled={loadingDatasets}
                          className="justify-start text-left h-auto py-2 px-3 border-purple-500/30 hover:bg-purple-950/30"
                        >
                          <div className="flex-1">
                            <div className="text-xs font-medium text-white">{template.name}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {template.entry_count} entries
                            </div>
                          </div>
                          <Plus className="h-3 w-3 ml-2 text-purple-400" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">No templates available</p>
                  )}
                </Card>
              )}

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
                  <p className="text-sm text-zinc-400 mb-2">
                    No datasets available. Create one from a template above or create manually.
                  </p>
                  <Link href="/datasets">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-3 w-3" />
                      Create Dataset
                    </Button>
                  </Link>
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
            {/* Evaluation Report */}
            <EvaluationReport evaluation={evaluation} />

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

