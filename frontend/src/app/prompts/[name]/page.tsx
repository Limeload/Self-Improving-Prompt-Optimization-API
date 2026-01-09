"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient, PromptResponse, PromptVersionResponse, EvaluationResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { StatusPill, VersionTimeline, MetricBadge, EvaluationTable, EvaluationReport } from "@/components/prompts";
import { ArrowLeft, Play, TrendingUp, FileText, History, BarChart3, Trash2, GitBranch, CheckCircle2, XCircle, Clock, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImprovementResponse } from "@/lib/api-client";

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
          {activeTab === "history" && <HistoryTab promptName={promptName} versions={versions} />}
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

function HistoryTab({ promptName, versions }: { promptName: string; versions: PromptVersionResponse[] }) {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const evaluationsList = await apiClient.evaluations.listForPrompt(promptName);
        setEvaluations(evaluationsList);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load history";
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
      loadData();
    }
  }, [promptName, toast]);

  const getTimeAgo = (date: string): string => {
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
  };

  // Combine all events into a timeline
  interface TimelineEvent {
    type: "version" | "evaluation" | "improvement";
    date: string;
    data: PromptVersionResponse | EvaluationResponse | any;
  }

  // Separate improvements from regular evaluations
  const improvementEvaluations = evaluations.filter(e => e.evaluation_type === "improvement");
  const regularEvaluations = evaluations.filter(e => e.evaluation_type !== "improvement");

  const timelineEvents: TimelineEvent[] = [
    ...versions.map(v => ({ type: "version" as const, date: v.created_at, data: v })),
    ...regularEvaluations.map(e => ({ type: "evaluation" as const, date: e.created_at, data: e })),
    ...improvementEvaluations.map(e => ({ type: "improvement" as const, date: e.created_at, data: e })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <span className="ml-2 text-zinc-400">Loading history...</span>
        </div>
      </Card>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <History className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No history available</p>
          <p className="text-sm text-zinc-500">
            History will appear here as you create versions, run evaluations, and trigger improvements
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-950/50 rounded-lg">
                <GitBranch className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Versions</p>
                <p className="text-2xl font-bold text-white">{versions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-950/50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Evaluations</p>
                <p className="text-2xl font-bold text-white">{evaluations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-950/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Improvements</p>
                <p className="text-2xl font-bold text-white">
                  {improvementEvaluations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-zinc-700 pb-6 last:pb-0 last:border-l-0">
                <div className="absolute -left-2.5 top-0">
                  {event.type === "version" && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-zinc-900"></div>
                  )}
                  {event.type === "evaluation" && (
                    <div className="w-5 h-5 rounded-full bg-purple-500 border-2 border-zinc-900"></div>
                  )}
                  {event.type === "improvement" && (
                    <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-zinc-900"></div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {/* Version Event */}
                  {event.type === "version" && (
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-blue-400" />
                          <span className="font-semibold text-white">Version Created</span>
                        </div>
                        <span className="text-xs text-zinc-500">{getTimeAgo(event.date)}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-zinc-300">
                          <span className="font-medium">v{(event.data as PromptVersionResponse).version}</span>
                          {" "}
                          <span className="text-zinc-500">
                            • {(event.data as PromptVersionResponse).status}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(event.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Evaluation Event */}
                  {event.type === "evaluation" && (
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-purple-400" />
                          <span className="font-semibold text-white">Evaluation Run</span>
                        </div>
                        <span className="text-xs text-zinc-500">{getTimeAgo(event.date)}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">
                            v{(event.data as EvaluationResponse).prompt_version}
                          </span>
                          {(event.data as EvaluationResponse).overall_score !== undefined && (
                            <span className={`text-lg font-bold ${
                              (event.data as EvaluationResponse).overall_score! >= 0.8 ? "text-green-400" :
                              (event.data as EvaluationResponse).overall_score! >= 0.6 ? "text-yellow-400" :
                              "text-red-400"
                            }`}>
                              {((event.data as EvaluationResponse).overall_score! * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          {(event.data as EvaluationResponse).correctness_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Correctness:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).correctness_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).format_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Format:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).format_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).verbosity_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Verbosity:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).verbosity_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).safety_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Safety:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).safety_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).consistency_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Consistency:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).consistency_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        {(event.data as EvaluationResponse).total_examples && (
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>{(event.data as EvaluationResponse).total_examples} examples</span>
                            {(event.data as EvaluationResponse).passed_examples !== undefined && (
                              <span className="text-green-400">
                                {(event.data as EvaluationResponse).passed_examples} passed
                              </span>
                            )}
                            {(event.data as EvaluationResponse).failed_examples !== undefined && 
                             (event.data as EvaluationResponse).failed_examples! > 0 && (
                              <span className="text-red-400">
                                {(event.data as EvaluationResponse).failed_examples} failed
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-zinc-500">
                          {new Date(event.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Improvement Event */}
                  {event.type === "improvement" && (
                    <div className="bg-zinc-800/50 p-4 rounded-lg border border-green-500/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          <span className="font-semibold text-white">Improvement Run</span>
                        </div>
                        <span className="text-xs text-zinc-500">{getTimeAgo(event.date)}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">
                            v{(event.data as EvaluationResponse).prompt_version}
                          </span>
                          {(event.data as EvaluationResponse).overall_score !== undefined && (
                            <span className={`text-lg font-bold ${
                              (event.data as EvaluationResponse).overall_score! >= 0.8 ? "text-green-400" :
                              (event.data as EvaluationResponse).overall_score! >= 0.6 ? "text-yellow-400" :
                              "text-red-400"
                            }`}>
                              {((event.data as EvaluationResponse).overall_score! * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          {(event.data as EvaluationResponse).correctness_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Correctness:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).correctness_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).format_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Format:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).format_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).verbosity_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Verbosity:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).verbosity_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).safety_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Safety:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).safety_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {(event.data as EvaluationResponse).consistency_score !== undefined && (
                            <div>
                              <span className="text-zinc-500">Consistency:</span>{" "}
                              <span className="text-white">
                                {((event.data as EvaluationResponse).consistency_score! * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        {(event.data as EvaluationResponse).total_examples && (
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>{(event.data as EvaluationResponse).total_examples} examples</span>
                            {(event.data as EvaluationResponse).passed_examples !== undefined && (
                              <span className="text-green-400">
                                {(event.data as EvaluationResponse).passed_examples} passed
                              </span>
                            )}
                            {(event.data as EvaluationResponse).failed_examples !== undefined && 
                             (event.data as EvaluationResponse).failed_examples! > 0 && (
                              <span className="text-red-400">
                                {(event.data as EvaluationResponse).failed_examples} failed
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-zinc-500">
                          {new Date(event.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

