"use client";

import { useState, useEffect } from "react";
import { apiClient, PromptCreate, PromptResponse, PromptRunRequest, PromptRunResponse, PromptVersionResponse, EvaluationResponse, ImprovementResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { JSONEditor } from "@/components/prompts/JSONEditor";
import { ArrowLeft, Play, Save, Loader2, CheckCircle2, XCircle, Sparkles, History, ChevronDown, ChevronUp, BarChart3, TrendingUp, GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

interface JudgeEvaluation {
  scores: {
    correctness?: number;
    format?: number;
    verbosity?: number;
    safety?: number;
    consistency?: number;
    overall?: number;
  };
  feedback?: string;
  reasoning?: string;
}

export default function CreatePromptPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<PromptCreate>({
    name: "",
    version: "1.0.0",
    template_text: "",
    status: "draft",
  });
  
  // Test state
  const [testInput, setTestInput] = useState<Record<string, unknown>>({});
  const [testOutput, setTestOutput] = useState<PromptRunResponse | null>(null);
  const [judgeEvaluation, setJudgeEvaluation] = useState<JudgeEvaluation | null>(null);
  const [testing, setTesting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  // Save state
  const [saving, setSaving] = useState(false);
  const [createdPrompt, setCreatedPrompt] = useState<PromptResponse | null>(null);

  // History state
  const [versions, setVersions] = useState<PromptVersionResponse[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);
  const [improvements, setImprovements] = useState<ImprovementResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load history when prompt name changes
  useEffect(() => {
    if (formData.name && formData.name.trim().length > 0) {
      loadHistory(formData.name);
    } else {
      setVersions([]);
      setEvaluations([]);
      setImprovements([]);
      setShowHistory(false);
    }
  }, [formData.name]);

  const loadHistory = async (promptName: string) => {
    try {
      setLoadingHistory(true);
      const [versionsData, evaluationsData] = await Promise.all([
        apiClient.prompts.getVersions(promptName).catch(() => []),
        apiClient.evaluations.listForPrompt(promptName).catch(() => []),
      ]);
      setVersions(versionsData);
      setEvaluations(evaluationsData);
      // Improvements are tracked through evaluations with type "improvement"
      // For now, we'll show all evaluations and let users filter
      setImprovements([]);
      if (versionsData.length > 0 || evaluationsData.length > 0) {
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const handleTest = async () => {
    if (!formData.template_text.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt template first",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(testInput).length === 0) {
      toast({
        title: "Error",
        description: "Please provide test input data",
        variant: "destructive",
      });
      return;
    }

    // First, create a temporary prompt to test
    let tempPrompt: PromptResponse;
    try {
      setTesting(true);
      setTestOutput(null);
      setJudgeEvaluation(null);

      const tempFormData: PromptCreate = {
        ...formData,
        name: formData.name || `temp_${Date.now()}`,
        status: "draft",
      };

      tempPrompt = await apiClient.prompts.create(tempFormData);

      // Run the prompt
      const runRequest: PromptRunRequest = {
        input_data: testInput,
      };
      const output = await apiClient.prompts.run(tempPrompt.name, runRequest);
      setTestOutput(output);

      // Evaluate with LLMJudge
      setEvaluating(true);
      try {
        const evalResult = await apiClient.evaluations.evaluate(tempPrompt.name, {
          evaluation_dimensions: ["correctness", "format", "verbosity", "safety", "consistency"],
        });

        // Extract judge feedback from first result if available
        if (evalResult.results && evalResult.results.length > 0) {
          const firstResult = evalResult.results[0];
          setJudgeEvaluation({
            scores: {
              correctness: firstResult.correctness_score,
              format: firstResult.format_score,
              verbosity: firstResult.verbosity_score,
              safety: firstResult.safety_score,
              consistency: firstResult.consistency_score,
              overall: firstResult.overall_score,
            },
            feedback: firstResult.judge_feedback || undefined,
            reasoning: firstResult.judge_reasoning || undefined,
          });
        } else {
          // Use aggregate scores
          setJudgeEvaluation({
            scores: {
              correctness: evalResult.correctness_score || undefined,
              format: evalResult.format_score || undefined,
              verbosity: evalResult.verbosity_score || undefined,
              safety: evalResult.safety_score || undefined,
              consistency: evalResult.consistency_score || undefined,
              overall: evalResult.overall_score || undefined,
            },
          });
        }
      } catch (evalError) {
        console.warn("Judge evaluation failed:", evalError);
        // Continue without judge evaluation
      }

      toast({
        title: "Success",
        description: "Prompt tested successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to test prompt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
      setEvaluating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.template_text) {
      toast({
        title: "Error",
        description: "Please fill in name and template text",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const prompt = await apiClient.prompts.create(formData);
      setCreatedPrompt(prompt);
      toast({
        title: "Success",
        description: `Prompt "${prompt.name}" created successfully`,
      });
      
      // Redirect to prompt detail page
      setTimeout(() => {
        router.push(`/prompts/${encodeURIComponent(prompt.name)}`);
      }, 1000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create prompt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score?: number): string => {
    if (score === undefined) return "text-zinc-500";
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/prompts"
          className="mb-6 inline-flex items-center text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Prompts
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Prompt</h1>
          <p className="text-zinc-400">Build and test your prompt with live evaluation</p>
        </div>

        {/* History Section */}
        {showHistory && (versions.length > 0 || evaluations.length > 0) && (
          <Card className="mb-6 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-400" />
                  Prompt History: {formData.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-zinc-400"
                >
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent className="space-y-6">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    <span className="ml-2 text-zinc-400">Loading history...</span>
                  </div>
                ) : (
                  <>
                    {/* Versions */}
                    {versions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Versions ({versions.length})
                        </h3>
                        <div className="space-y-2">
                          {versions.slice(0, 5).map((version) => (
                            <div
                              key={version.id}
                              className="p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-white font-medium">v{version.version}</span>
                                  <span className="text-zinc-400 text-sm ml-2">
                                    {getTimeAgo(version.created_at)}
                                  </span>
                                </div>
                                <Link href={`/prompts/${encodeURIComponent(formData.name)}`}>
                                  <Button variant="ghost" size="sm" className="text-xs">
                                    View
                                  </Button>
                                </Link>
                              </div>
                              {version.status && (
                                <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${
                                  version.status === "active" ? "bg-green-950/50 text-green-300" :
                                  version.status === "draft" ? "bg-yellow-950/50 text-yellow-300" :
                                  "bg-zinc-700 text-zinc-300"
                                }`}>
                                  {version.status}
                                </span>
                              )}
                            </div>
                          ))}
                          {versions.length > 5 && (
                            <p className="text-xs text-zinc-500 text-center">
                              ... and {versions.length - 5} more versions
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Evaluations */}
                    {evaluations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Evaluations ({evaluations.length})
                        </h3>
                        <div className="space-y-2">
                          {evaluations.slice(0, 5).map((eval) => (
                            <div
                              key={eval.id}
                              className="p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-white font-medium">
                                    v{eval.prompt_version}
                                  </span>
                                  <span className="text-zinc-400 text-sm ml-2">
                                    {getTimeAgo(eval.created_at)}
                                  </span>
                                </div>
                                {eval.overall_score !== undefined && (
                                  <span className={`text-sm font-semibold ${
                                    eval.overall_score >= 0.8 ? "text-green-400" :
                                    eval.overall_score >= 0.6 ? "text-yellow-400" :
                                    "text-red-400"
                                  }`}>
                                    {(eval.overall_score * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                {eval.total_examples && (
                                  <span>{eval.total_examples} examples</span>
                                )}
                                {eval.passed_examples !== undefined && (
                                  <span>{eval.passed_examples} passed</span>
                                )}
                                {eval.failed_examples !== undefined && eval.failed_examples > 0 && (
                                  <span className="text-red-400">{eval.failed_examples} failed</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {evaluations.length > 5 && (
                            <p className="text-xs text-zinc-500 text-center">
                              ... and {evaluations.length - 5} more evaluations
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Improvements */}
                    {improvements.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Improvements ({improvements.length})
                        </h3>
                        <div className="space-y-2">
                          {improvements.slice(0, 5).map((improvement, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-white font-medium">
                                    {improvement.promotion_decision === "promoted" ? "✓ Promoted" : "Rejected"}
                                  </span>
                                  <span className="text-zinc-400 text-sm ml-2">
                                    {getTimeAgo(improvement.created_at)}
                                  </span>
                                </div>
                                {improvement.improvement_delta !== undefined && (
                                  <span className={`text-sm font-semibold ${
                                    improvement.improvement_delta > 0 ? "text-green-400" : "text-red-400"
                                  }`}>
                                    {improvement.improvement_delta > 0 ? "+" : ""}
                                    {(improvement.improvement_delta * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-2">
                                {improvement.promotion_reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {versions.length === 0 && evaluations.length === 0 && improvements.length === 0 && (
                      <p className="text-zinc-400 text-center py-4">No history found for this prompt</p>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Prompt Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-white">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., sentiment_analyzer"
                      className="mt-1 bg-zinc-800 text-white border-zinc-700"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="version" className="text-white">
                      Version *
                    </Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0.0"
                      className="mt-1 bg-zinc-800 text-white border-zinc-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="template_text" className="text-white">
                    Prompt Template *
                  </Label>
                  <textarea
                    id="template_text"
                    value={formData.template_text}
                    onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
                    placeholder="Enter your prompt template here. Use {{variable_name}} for inputs."
                    rows={12}
                    className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500 font-mono text-sm border border-zinc-700"
                    required
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Use <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">{"{{variable_name}}"}</code> syntax for input variables
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.name || !formData.template_text}
                    className="flex-1 bg-white text-black hover:bg-zinc-200"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Prompt
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Input Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Test Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Test Input Data (JSON)</Label>
                  <JSONEditor
                    value={testInput}
                    onChange={setTestInput}
                    label=""
                    className="mt-2"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Enter test data matching your template variables
                  </p>
                </div>
                <Button
                  onClick={handleTest}
                  disabled={testing || !formData.template_text || Object.keys(testInput).length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Test Prompt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Output & Evaluation */}
          <div className="space-y-6">
            {/* Output Preview */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Output</CardTitle>
              </CardHeader>
              <CardContent>
                {testing && !testOutput ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-zinc-400">Running prompt...</span>
                  </div>
                ) : testOutput ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Execution Successful</span>
                    </div>
                    <JSONEditor
                      value={testOutput.output}
                      readOnly
                      label=""
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">
                      Output will appear here after testing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLMJudge Evaluation */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  LLM Judge Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evaluating ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-zinc-400">Evaluating with LLM Judge...</span>
                  </div>
                ) : judgeEvaluation ? (
                  <div className="space-y-4">
                    {/* Overall Score */}
                    {judgeEvaluation.scores.overall !== undefined && (
                      <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-300">Overall Score</span>
                          <span className={`text-2xl font-bold ${getScoreColor(judgeEvaluation.scores.overall)}`}>
                            {(judgeEvaluation.scores.overall * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={judgeEvaluation.scores.overall * 100} 
                          className="h-2 [&>div]:bg-blue-500"
                        />
                      </div>
                    )}

                    {/* Dimension Scores */}
                    <div className="space-y-3">
                      {judgeEvaluation.scores.correctness !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300">Correctness</span>
                            <span className={`text-sm font-semibold ${getScoreColor(judgeEvaluation.scores.correctness)}`}>
                              {(judgeEvaluation.scores.correctness * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={judgeEvaluation.scores.correctness * 100} className="h-1.5" />
                        </div>
                      )}
                      {judgeEvaluation.scores.format !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300">Format</span>
                            <span className={`text-sm font-semibold ${getScoreColor(judgeEvaluation.scores.format)}`}>
                              {(judgeEvaluation.scores.format * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={judgeEvaluation.scores.format * 100} className="h-1.5" />
                        </div>
                      )}
                      {judgeEvaluation.scores.verbosity !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300">Verbosity</span>
                            <span className={`text-sm font-semibold ${getScoreColor(judgeEvaluation.scores.verbosity)}`}>
                              {(judgeEvaluation.scores.verbosity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={judgeEvaluation.scores.verbosity * 100} className="h-1.5" />
                        </div>
                      )}
                      {judgeEvaluation.scores.safety !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300">Safety</span>
                            <span className={`text-sm font-semibold ${getScoreColor(judgeEvaluation.scores.safety)}`}>
                              {(judgeEvaluation.scores.safety * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={judgeEvaluation.scores.safety * 100} className="h-1.5" />
                        </div>
                      )}
                      {judgeEvaluation.scores.consistency !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-300">Consistency</span>
                            <span className={`text-sm font-semibold ${getScoreColor(judgeEvaluation.scores.consistency)}`}>
                              {(judgeEvaluation.scores.consistency * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={judgeEvaluation.scores.consistency * 100} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    {/* Judge Feedback */}
                    {judgeEvaluation.feedback && (
                      <div className="pt-4 border-t border-zinc-800">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">Judge Feedback</h4>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {judgeEvaluation.feedback}
                        </p>
                      </div>
                    )}

                    {judgeEvaluation.reasoning && (
                      <div className="pt-4 border-t border-zinc-800">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">Reasoning</h4>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {judgeEvaluation.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">
                      Evaluation will appear here after testing
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      LLM Judge evaluates correctness, format, verbosity, safety, and consistency
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
