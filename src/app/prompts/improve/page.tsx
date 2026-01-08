"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, ImprovementRequest, ImprovementResponse, DatasetResponse, PromptDiffResponse } from "@/lib/api-client";
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
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [improvement, setImprovement] = useState<ImprovementResponse | null>(null);
  const [diff, setDiff] = useState<PromptDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const promptParam = searchParams?.get("prompt");
    if (promptParam) {
      setPromptName(promptParam);
    }
    loadDatasets();
  }, [searchParams]);

  useEffect(() => {
    if (improvement?.baseline_prompt_id && improvement?.best_candidate_id) {
      loadDiff();
    }
  }, [improvement]);

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
                Prompt Name
              </Label>
              <Input
                id="promptName"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="e.g., sentiment_analyzer"
                className="mt-1 bg-zinc-800 text-white"
              />
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
                  <option value="">Select a dataset...</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id.toString()}>
                      {dataset.name} ({dataset.entry_count} entries)
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="datasetId"
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  placeholder="Enter dataset ID (e.g., 1)"
                  type="number"
                  className="mt-1 bg-zinc-800 text-white"
                />
              )}
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
                    <Link href={`/prompts/${promptName}`}>
                      <Button variant="outline">
                        View Updated Prompt
                      </Button>
                    </Link>
                  )}
                  <Link href={`/prompts/${promptName}`}>
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

