"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient, PromptResponse, PromptVersionResponse, EvaluationResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { StatusPill, VersionTimeline, MetricBadge, EvaluationTable } from "@/components/prompts";
import { ArrowLeft, Play, TrendingUp, FileText, History, BarChart3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "overview" | "versions" | "evaluations" | "improve" | "history";

export default function PromptDetailPage() {
  const params = useParams();
  // Decode the prompt name from URL params (Next.js may pass it encoded)
  const promptName = params.name ? decodeURIComponent(params.name as string) : "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [prompt, setPrompt] = useState<PromptResponse | null>(null);
  const [versions, setVersions] = useState<PromptVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const loadPromptData = async () => {
    try {
      setLoading(true);
      console.log("Loading prompt with name:", promptName);
      const [promptData, versionsData] = await Promise.all([
        apiClient.prompts.get(promptName).catch((err) => {
          console.error("Error loading prompt:", err);
          throw err;
        }),
        apiClient.prompts.getVersions(promptName).catch(() => []),
      ]);
      if (promptData) {
        setPrompt(promptData);
      }
      setVersions(versionsData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load prompt";
      console.error("Failed to load prompt data:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promptName) {
      loadPromptData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptName]);

  const handleDelete = async () => {
    if (!prompt) return;
    
    if (!confirm(`Are you sure you want to delete "${prompt.name}" v${prompt.version}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.prompts.delete(prompt.name, prompt.version);
      toast({
        title: "Success",
        description: `Prompt ${prompt.name} v${prompt.version} deleted`,
      });
      router.push("/prompts");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete prompt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };


  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { id: "versions", label: "Versions", icon: <History className="h-4 w-4" /> },
    { id: "evaluations", label: "Evaluations", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "improve", label: "Improve", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6">
            <p className="text-zinc-400">Loading prompt...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6">
            <p className="text-zinc-400">Prompt not found</p>
            <Link href="/prompts">
              <Button variant="outline" className="mt-4">
                Back to Prompts
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/prompts"
            className="mb-4 inline-flex items-center text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prompts
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{prompt.name}</h1>
                <StatusPill status={prompt.status} />
              </div>
              <p className="text-zinc-400">Version {prompt.version}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/prompts/${encodeURIComponent(promptName)}/run`}>
                <Button variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Run Inference
                </Button>
              </Link>
              <Link href={`/prompts/evaluate?prompt=${encodeURIComponent(promptName)}`}>
                <Button variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Evaluate
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-400 hover:text-red-300 hover:border-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-800">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && <OverviewTab prompt={prompt} />}
          {activeTab === "versions" && (
            <VersionsTab prompt={prompt} versions={versions} />
          )}
          {activeTab === "evaluations" && (
            <EvaluationsTab promptName={promptName} />
          )}
          {activeTab === "improve" && <ImproveTab promptName={promptName} />}
          {activeTab === "history" && <HistoryTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ prompt }: { prompt: PromptResponse }) {
  if (!prompt) {
    return (
      <Card className="p-6">
        <p className="text-zinc-400">No prompt data available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prompt Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Prompt Template</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm font-mono text-zinc-300 bg-zinc-950 p-4 rounded overflow-x-auto whitespace-pre-wrap">
            {prompt.template_text || "(No template text)"}
          </pre>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Schemas */}
        {(prompt.input_schema || prompt.output_schema) ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Schemas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prompt.input_schema ? (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-400 mb-2">Input Schema</h4>
                  <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded overflow-x-auto">
                    {JSON.stringify(prompt.input_schema, null, 2)}
                  </pre>
                </div>
              ) : null}
              {prompt.output_schema ? (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-400 mb-2">Output Schema</h4>
                  <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded overflow-x-auto">
                    {JSON.stringify(prompt.output_schema, null, 2)}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Schemas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm">No schemas defined</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {prompt.metadata ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded overflow-x-auto">
                {JSON.stringify(prompt.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm">No metadata defined</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Timestamps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Created:</span>{" "}
              <span className="text-white">
                {prompt.created_at ? new Date(prompt.created_at).toLocaleString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Updated:</span>{" "}
              <span className="text-white">
                {prompt.updated_at ? new Date(prompt.updated_at).toLocaleString() : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VersionsTab({
  prompt,
  versions,
}: {
  prompt: PromptResponse;
  versions: PromptVersionResponse[];
}) {
  return (
    <div>
      <VersionTimeline versions={versions} currentVersionId={prompt.id} />
    </div>
  );
}

function EvaluationsTab({ promptName }: { promptName: string }) {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadEvaluations = async () => {
      try {
        setLoading(true);
        const evaluationsList = await apiClient.evaluations.listForPrompt(promptName);
        setEvaluations(evaluationsList);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load evaluations";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (promptName) {
      loadEvaluations();
    }
  }, [promptName, toast]);

  if (loading) {
    return <Card className="p-6">Loading evaluations...</Card>;
  }

  if (evaluations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">No evaluations yet</p>
          <Link href={`/prompts/evaluate?prompt=${encodeURIComponent(promptName)}`}>
            <Button>Run Evaluation</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => (
        <Card key={evaluation.id} className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Evaluation #{evaluation.id}
                </h3>
                <p className="text-sm text-zinc-400">
                  {new Date(evaluation.created_at).toLocaleString()}
                </p>
              </div>
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
            </div>
            <div className="grid grid-cols-5 gap-4 mb-4">
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
              <MetricBadge
                label="Consistency"
                value={evaluation.consistency_score || 0}
                variant="default"
              />
            </div>
          </div>
          {evaluation.results && evaluation.results.length > 0 && (
            <EvaluationTable results={evaluation.results} showDetails />
          )}
        </Card>
      ))}
    </div>
  );
}

function ImproveTab({ promptName }: { promptName: string }) {
  return (
    <Card className="p-6">
      <div className="text-center py-8">
        <p className="text-zinc-400 mb-4">Trigger self-improvement for this prompt</p>
        <Link href={`/prompts/improve?prompt=${encodeURIComponent(promptName)}`}>
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
            Start Improvement
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function HistoryTab() {
  return (
    <Card className="p-6">
      <div className="text-center py-8">
        <p className="text-zinc-400 mb-4">History and audit log coming soon</p>
        <p className="text-sm text-zinc-500">
          This will show all actions, promotions, and changes for this prompt
        </p>
      </div>
    </Card>
  );
}

