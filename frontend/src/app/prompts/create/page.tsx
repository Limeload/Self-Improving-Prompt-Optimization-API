"use client";

import { useState, useEffect } from "react";
import { apiClient, PromptCreate, PromptResponse, PromptVersionResponse, EvaluationResponse, ImprovementResponse, DatasetResponse, EvaluationRequest, ImprovementRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { JSONEditor } from "@/components/prompts/JSONEditor";
import { MetricBadge, EvaluationTable, PromotionDecisionBanner } from "@/components/prompts";
import { Plus, ArrowLeft, ChevronDown, ChevronUp, Info, Eye, Play, TrendingUp, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreatePromptPage() {
  const [formData, setFormData] = useState<PromptCreate>({
    name: "",
    version: "1.0.0",
    template_text: "",
    status: "draft",
    input_schema: undefined,
    output_schema: undefined,
    metadata: undefined,
    parent_version_id: undefined,
  });
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [createdPrompt, setCreatedPrompt] = useState<PromptResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [existingPrompts, setExistingPrompts] = useState<PromptResponse[]>([]);
  const [selectedParentName, setSelectedParentName] = useState<string>("");
  const [parentVersions, setParentVersions] = useState<PromptVersionResponse[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [improvement, setImprovement] = useState<ImprovementResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadExistingPrompts();
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedParentName) {
      loadParentVersions(selectedParentName);
    } else {
      setParentVersions([]);
      setFormData((prev) => ({ ...prev, parent_version_id: undefined }));
    }
  }, [selectedParentName]);

  const loadExistingPrompts = async () => {
    try {
      const prompts = await apiClient.prompts.list();
      setExistingPrompts(prompts);
    } catch {
      // Silently fail
    }
  };

  const loadParentVersions = async (name: string) => {
    try {
      const versions = await apiClient.prompts.getVersions(name);
      setParentVersions(versions);
    } catch {
      setParentVersions([]);
    }
  };

  const loadDatasets = async () => {
    try {
      const datasetsList = await apiClient.datasets.list().catch(() => []);
      setDatasets(datasetsList);
    } catch {
      // Silently fail
    }
  };

  const handleEvaluate = async () => {
    if (!createdPrompt) return;

    try {
      setEvaluating(true);
      setEvaluation(null);
      setImprovement(null); // Clear improvement results when evaluating
      const request: EvaluationRequest = {
        dataset_id: selectedDatasetId ? parseInt(selectedDatasetId) : undefined,
        evaluation_dimensions: [
          "correctness",
          "format",
          "verbosity",
          "safety",
          "consistency",
        ],
      };
      console.log("Evaluating prompt:", createdPrompt.name);
      console.log("Request:", request);
      const result = await apiClient.evaluations.evaluate(createdPrompt.name, request);
      console.log("Evaluation result:", result);
      setEvaluation(result);
      toast({
        title: "Success",
        description: `Evaluation completed. Score: ${(result.overall_score || 0).toFixed(2)}`,
      });
      // Scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.getElementById("evaluation-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    } catch (error: unknown) {
      console.error("Evaluation error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'data' in error && typeof error.data === 'object' && error.data !== null && 'detail' in error.data && typeof error.data.detail === 'string')
          ? error.data.detail
          : "Failed to evaluate prompt";
      toast({
        title: "Error",
        description: `Failed to evaluate prompt "${createdPrompt.name}": ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleImprove = async () => {
    if (!createdPrompt) return;

    try {
      setImproving(true);
      setImprovement(null);
      setEvaluation(null); // Clear evaluation results when improving
      const request: ImprovementRequest = {
        dataset_id: selectedDatasetId ? parseInt(selectedDatasetId) : undefined,
        improvement_threshold: 0.05,
        max_candidates: 3,
      };
      console.log("Improving prompt:", createdPrompt.name);
      console.log("Request:", request);
      const result = await apiClient.evaluations.improve(createdPrompt.name, request);
      console.log("Improvement result:", result);
      setImprovement(result);
      toast({
        title: "Success",
        description: `Improvement process completed. Decision: ${result.promotion_decision}`,
      });
      // Scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.getElementById("improvement-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    } catch (error: unknown) {
      console.error("Improvement error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'data' in error && typeof error.data === 'object' && error.data !== null && 'detail' in error.data && typeof error.data.detail === 'string')
          ? error.data.detail
          : "Failed to improve prompt";
      toast({
        title: "Error",
        description: `Failed to improve prompt "${createdPrompt.name}": ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.template_text) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate JSON schemas if provided
    try {
      if (formData.input_schema && typeof formData.input_schema === 'string') {
        formData.input_schema = JSON.parse(formData.input_schema);
      }
      if (formData.output_schema && typeof formData.output_schema === 'string') {
        formData.output_schema = JSON.parse(formData.output_schema);
      }
      if (formData.metadata && typeof formData.metadata === 'string') {
        formData.metadata = JSON.parse(formData.metadata);
      }
      
      // Add description to metadata if provided
      const finalMetadata = formData.metadata || {};
      if (description.trim()) {
        finalMetadata.description = description.trim();
      }
      formData.metadata = Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined;
    } catch {
      toast({
        title: "Error",
        description: "Invalid JSON in schemas or metadata",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const newPrompt = await apiClient.prompts.create(formData);
      setCreatedPrompt(newPrompt);
      toast({
        title: "Success",
        description: `Prompt ${newPrompt.name} v${newPrompt.version} created successfully`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create prompt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTemplatePreview = () => {
    if (!formData.template_text) return "";
    
    // Simple preview - replace {{variable}} with example values
    let preview = formData.template_text;
    const variables = preview.match(/\{\{(\w+)\}\}/g);
    if (variables) {
      variables.forEach((varMatch) => {
        const varName = varMatch.replace(/\{\{|\}\}/g, "");
        preview = preview.replace(varMatch, `[${varName}]`);
      });
    }
    return preview;
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

        <h1 className="mb-8 text-3xl font-bold text-white">Create New Prompt</h1>

        {createdPrompt ? (
          <div className="space-y-6">
            <Card className="p-6 bg-green-900/20 border-green-500/50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">
                    ✓ Prompt Created Successfully!
                  </h2>
                  <div className="space-y-2 text-white">
                    <p>
                      <span className="text-zinc-400">Name:</span>{" "}
                      <span className="font-semibold">{createdPrompt.name}</span>
                    </p>
                    <p>
                      <span className="text-zinc-400">Version:</span>{" "}
                      <span className="font-semibold">{createdPrompt.version}</span>
                    </p>
                    <p>
                      <span className="text-zinc-400">Status:</span>{" "}
                      <span className="font-semibold capitalize">{createdPrompt.status}</span>
                    </p>
                    <p>
                      <span className="text-zinc-400">ID:</span>{" "}
                      <span className="font-semibold">{createdPrompt.id}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-4">
                {/* Dataset Selection */}
                {datasets.length > 0 && (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      Select Dataset (Optional)
                    </Label>
                    <select
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                      className="w-full rounded-md bg-zinc-800 p-2 text-white text-sm"
                    >
                      <option value="">No dataset (use default test cases)</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id.toString()}>
                          {dataset.name} ({dataset.entry_count} entries)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Evaluate Prompt
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleImprove}
                    disabled={improving}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {improving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Improve Prompt
                      </>
                    )}
                  </Button>
                </div>

                {/* Links to Full Pages */}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/prompts/evaluate?prompt=${encodeURIComponent(createdPrompt.name)}`}>
                      <Button variant="outline" size="sm">
                        Open Evaluate Page
                      </Button>
                    </Link>
                    <Link href={`/prompts/improve?prompt=${encodeURIComponent(createdPrompt.name)}`}>
                      <Button variant="outline" size="sm">
                        Open Improve Page
                      </Button>
                    </Link>
                    <Link href={`/prompts/${encodeURIComponent(createdPrompt.name)}`}>
                      <Button variant="outline" size="sm">
                        View Prompt Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            {/* Evaluation Results */}
            {evaluation ? (
              <Card id="evaluation-results" className="p-6 border-blue-500/30 bg-blue-950/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    Evaluation Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

                    {/* Detailed Results */}
                    {evaluation.results && evaluation.results.length > 0 ? (
                      <div className="pt-4 border-t border-zinc-800">
                        <h4 className="text-sm font-semibold text-white mb-3">Per-Example Results</h4>
                        <EvaluationTable results={evaluation.results} showDetails />
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-zinc-800">
                        <p className="text-sm text-zinc-400">
                          No detailed per-example results available. The evaluation may not have included per-example results.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : evaluating ? (
              <Card className="p-6 border-blue-500/30 bg-blue-950/10">
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-3" />
                  <span className="text-zinc-400">Evaluating prompt...</span>
                </CardContent>
              </Card>
            ) : null}

            {/* Improvement Results */}
            {improvement ? (
              <Card id="improvement-results" className="p-6 border-purple-500/30 bg-purple-950/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Improvement Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <PromotionDecisionBanner improvement={improvement} />
                    
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
                          Status: <span className="text-zinc-400 capitalize">{improvement.promotion_decision}</span>
                        </p>
                        {improvement.promotion_reason && (
                          <p className="text-sm text-zinc-400 mt-2">{improvement.promotion_reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : improving ? (
              <Card className="p-6 border-purple-500/30 bg-purple-950/10">
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-3" />
                  <span className="text-zinc-400">Improving prompt...</span>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setCreatedPrompt(null);
                  setFormData({
                    name: "",
                    version: "1.0.0",
                    template_text: "",
                    status: "draft",
                    input_schema: undefined,
                    output_schema: undefined,
                    metadata: undefined,
                    parent_version_id: undefined,
                  });
                  setDescription("");
                  setSelectedParentName("");
                  setShowAdvanced(false);
                  setShowPreview(false);
                  setEvaluation(null);
                  setImprovement(null);
                  setSelectedDatasetId("");
                }}
                variant="outline"
              >
                Create Another
              </Button>
              <Link href="/prompts">
                <Button className="bg-white text-black hover:bg-zinc-200">
                  Back to Prompts
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">Basic Information</h2>
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
                        required
                        className="mt-1 bg-zinc-800 text-white"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Unique identifier for the prompt (lowercase, underscores only)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="version" className="text-white">
                        Version *
                      </Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="e.g., 1.0.0"
                        required
                        className="mt-1 bg-zinc-800 text-white"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        Semantic version (e.g., &quot;1.0.0&quot;) or custom (e.g., &quot;v2&quot;)
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-white">
                      Description
                    </Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this prompt does, its purpose, and any important notes..."
                      rows={3}
                      className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Optional description of the prompt&apos;s purpose and usage
                    </p>
                  </div>

                  {existingPrompts.length > 0 && (
                    <div>
                      <Label htmlFor="parent_name" className="text-white">
                        Parent Prompt (Optional)
                      </Label>
                      <select
                        id="parent_name"
                        value={selectedParentName}
                        onChange={(e) => setSelectedParentName(e.target.value)}
                        className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                      >
                        <option value="">None - New prompt</option>
                        {existingPrompts.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} (v{p.version})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        Select to create a new version of an existing prompt
                      </p>
                    </div>
                  )}

                  {selectedParentName && parentVersions.length > 0 && (
                    <div>
                      <Label htmlFor="parent_version" className="text-white">
                        Parent Version
                      </Label>
                      <select
                        id="parent_version"
                        value={formData.parent_version_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parent_version_id: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                      >
                        <option value="">Latest version</option>
                        {parentVersions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.version} ({v.status})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-zinc-500">
                        Select the specific version to base this prompt on
                      </p>
                    </div>
                  )}
                </div>

                {/* Template Text */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="template_text" className="text-white">
                      Template Text *
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {formData.template_text.length} characters
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {showPreview ? "Hide" : "Show"} Preview
                      </Button>
                    </div>
                  </div>
                  <textarea
                    id="template_text"
                    value={formData.template_text}
                    onChange={(e) =>
                      setFormData({ ...formData, template_text: e.target.value })
                    }
                    required
                    rows={12}
                    placeholder="Enter your prompt template here. Use {{variable_name}} for inputs.&#10;&#10;Example:&#10;Analyze the sentiment of the following text: {{text}}&#10;Return a JSON object with 'sentiment' (positive/negative/neutral) and 'confidence' (0-1)."
                    className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500 font-mono text-sm"
                  />
                  <div className="flex items-start gap-2 p-3 bg-blue-950/20 border border-blue-500/30 rounded">
                    <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-300">
                      Use <code className="bg-zinc-900 px-1 rounded">{"{{variable_name}}"}</code> syntax for input variables. 
                      The template will be processed with your input data when running the prompt.
                    </p>
                  </div>
                  {showPreview && formData.template_text && (
                    <Card className="bg-zinc-950 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-zinc-400">Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                          {getTemplatePreview()}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h2 className="text-xl font-semibold text-white">Advanced Options</h2>
                    {showAdvanced ? (
                      <ChevronUp className="h-5 w-5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-400" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="space-y-6 pt-2">
                      {/* Status */}
                      <div>
                        <Label htmlFor="status" className="text-white">
                          Status
                        </Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target.value as "draft" | "active" | "archived",
                            })
                          }
                          className="mt-1 w-full rounded-md bg-zinc-800 p-2 text-white"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                        <p className="mt-1 text-xs text-zinc-500">
                          Initial status of the prompt (defaults to draft)
                        </p>
                      </div>

                      {/* Input Schema */}
                      <div>
                        <Label className="text-white">Input Schema (JSON)</Label>
                        <p className="mt-1 mb-2 text-xs text-zinc-500">
                          JSON schema defining the expected input structure
                        </p>
                        <JSONEditor
                          value={formData.input_schema || {}}
                          onChange={(value) => setFormData({ ...formData, input_schema: value })}
                          label="Input Schema"
                        />
                        <div className="mt-2 p-3 bg-zinc-900/50 rounded text-xs text-zinc-400">
                          <strong>Example:</strong>
                          <pre className="mt-1 text-zinc-500">
{`{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Text to analyze"
    }
  },
  "required": ["text"]
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Output Schema */}
                      <div>
                        <Label className="text-white">Output Schema (JSON)</Label>
                        <p className="mt-1 mb-2 text-xs text-zinc-500">
                          JSON schema defining the expected output structure
                        </p>
                        <JSONEditor
                          value={formData.output_schema || {}}
                          onChange={(value) => setFormData({ ...formData, output_schema: value })}
                          label="Output Schema"
                        />
                        <div className="mt-2 p-3 bg-zinc-900/50 rounded text-xs text-zinc-400">
                          <strong>Example:</strong>
                          <pre className="mt-1 text-zinc-500">
{`{
  "type": "object",
  "properties": {
    "sentiment": {
      "type": "string",
      "enum": ["positive", "negative", "neutral"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["sentiment", "confidence"]
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div>
                        <Label className="text-white">Metadata (JSON)</Label>
                        <p className="mt-1 mb-2 text-xs text-zinc-500">
                          Additional configuration (model, temperature, task, constraints, etc.)
                        </p>
                        <JSONEditor
                          value={formData.metadata || {}}
                          onChange={(value) => setFormData({ ...formData, metadata: value })}
                          label="Metadata"
                        />
                        <div className="mt-2 p-3 bg-zinc-900/50 rounded text-xs text-zinc-400">
                          <strong>Example:</strong>
                          <pre className="mt-1 text-zinc-500">
{`{
  "model": "gpt-4",
  "temperature": 0.7,
  "task": "sentiment_analysis",
  "constraints": "Must return valid JSON",
  "owner": "team-ai"
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-800">
                  <Link href="/prompts">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-white text-black hover:bg-zinc-200"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {loading ? "Creating..." : "Create Prompt"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

