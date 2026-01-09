"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type PromptCreate, type EvaluationRequest, type ImprovementRequest } from "@/lib/api-client";
import { 
  FileText, 
  Play, 
  BarChart3, 
  AlertCircle, 
  Sparkles, 
  GitBranch, 
  CheckCircle2, 
  XCircle, 
  Globe,
  ArrowRight,
  Loader2
} from "lucide-react";

type StepStatus = "pending" | "in_progress" | "completed" | "error";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: typeof FileText;
  status: StepStatus;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Create Prompt
  const [promptName, setPromptName] = useState("");
  const [promptVersion, setPromptVersion] = useState("1.0.0");
  const [promptText, setPromptText] = useState("");
  const [createdPrompt, setCreatedPrompt] = useState<any>(null);
  
  // Step 2: Run Evaluation
  const [datasetEntries, setDatasetEntries] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  
  // Step 3-4: Metrics & Failures (from evaluation)
  
  // Step 5: Generate Improved Prompt
  const [improvementResult, setImprovementResult] = useState<any>(null);
  
  // Step 6-7: A/B Test & Promote/Reject (from improvement)
  
  // Step 8: Expose Stable API
  const [apiUrl, setApiUrl] = useState("");

  const steps: Step[] = [
    { id: 1, title: "Create Prompt", description: "Create a new prompt with template text", icon: FileText, status: currentStep > 1 ? "completed" : currentStep === 1 ? "in_progress" : "pending" },
    { id: 2, title: "Run Evaluation", description: "Evaluate prompt against dataset", icon: Play, status: currentStep > 2 ? "completed" : currentStep === 2 ? "in_progress" : "pending" },
    { id: 3, title: "Collect Metrics", description: "View correctness, format, verbosity, safety scores", icon: BarChart3, status: currentStep > 3 ? "completed" : currentStep === 3 ? "in_progress" : "pending" },
    { id: 4, title: "Analyze Failures", description: "Review failure cases and identify issues", icon: AlertCircle, status: currentStep > 4 ? "completed" : currentStep === 4 ? "in_progress" : "pending" },
    { id: 5, title: "Generate Improved Prompt", description: "Auto-generate improved candidate prompts", icon: Sparkles, status: currentStep > 5 ? "completed" : currentStep === 5 ? "in_progress" : "pending" },
    { id: 6, title: "A/B Test", description: "Compare baseline vs improved candidates", icon: GitBranch, status: currentStep > 6 ? "completed" : currentStep === 6 ? "in_progress" : "pending" },
    { id: 7, title: "Promote or Reject", description: "Automatically promote best candidate or reject", icon: CheckCircle2, status: currentStep > 7 ? "completed" : currentStep === 7 ? "in_progress" : "pending" },
    { id: 8, title: "Expose Stable API", description: "Use promoted prompt via API endpoint", icon: Globe, status: currentStep >= 8 ? "completed" : "pending" },
  ];

  const handleCreatePrompt = async () => {
    if (!promptName || !promptVersion || !promptText) {
      alert("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const promptData: PromptCreate = {
        name: promptName,
        version: promptVersion,
        template_text: promptText,
        status: "draft",
      };
      
      const result = await apiClient.prompts.create(promptData);
      setCreatedPrompt(result);
      setCurrentStep(2);
    } catch (error: any) {
      alert(`Error creating prompt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!createdPrompt || !datasetEntries) {
      alert("Please create a prompt and provide dataset entries");
      return;
    }
    
    setLoading(true);
    try {
      // Parse dataset entries (expecting JSON array)
      let entries;
      try {
        entries = JSON.parse(datasetEntries);
      } catch {
        // If not JSON, create a simple entry
        entries = [{ input_data: { text: datasetEntries } }];
      }
      
      const evalData: EvaluationRequest = {
        dataset_entries: entries,
      };
      
      const result = await apiClient.evaluations.evaluate(createdPrompt.name, evalData);
      setEvaluationResult(result);
      setCurrentStep(3);
    } catch (error: any) {
      alert(`Error running evaluation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImprovement = async () => {
    if (!createdPrompt || !evaluationResult) {
      alert("Please complete evaluation first");
      return;
    }
    
    setLoading(true);
    try {
      const improveData: ImprovementRequest = {
        max_candidates: 3,
        improvement_threshold: 0.1,
      };
      
      const result = await apiClient.evaluations.improve(createdPrompt.name, improveData);
      setImprovementResult(result);
      setCurrentStep(6);
    } catch (error: any) {
      alert(`Error generating improvement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="promptName">Prompt Name</Label>
              <Input
                id="promptName"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="e.g., code-review-assistant"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="promptVersion">Version</Label>
              <Input
                id="promptVersion"
                value={promptVersion}
                onChange={(e) => setPromptVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="promptText">Prompt Template</Label>
              <textarea
                id="promptText"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Enter your prompt template here..."
                className="mt-1 w-full min-h-[200px] p-3 border border-zinc-700 rounded-md bg-zinc-900 text-white"
              />
            </div>
            <Button onClick={handleCreatePrompt} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Prompt
            </Button>
            {createdPrompt && (
              <div className="mt-4 p-4 bg-green-950/20 border border-green-500/30 rounded-md">
                <p className="text-green-400">✓ Prompt created successfully!</p>
                <p className="text-sm text-zinc-400 mt-2">ID: {createdPrompt.id}, Name: {createdPrompt.name}, Version: {createdPrompt.version}</p>
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="datasetEntries">Dataset Entries (JSON array)</Label>
              <textarea
                id="datasetEntries"
                value={datasetEntries}
                onChange={(e) => setDatasetEntries(e.target.value)}
                placeholder='[{"input_data": {"text": "example"}}, {"input_data": {"text": "another example"}}]'
                className="mt-1 w-full min-h-[200px] p-3 border border-zinc-700 rounded-md bg-zinc-900 text-white font-mono text-sm"
              />
              <p className="text-xs text-zinc-400 mt-1">Enter JSON array of entries with input_data, or simple text for single entry</p>
            </div>
            <Button onClick={handleRunEvaluation} disabled={loading || !createdPrompt}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run Evaluation
            </Button>
            {evaluationResult && (
              <div className="mt-4 p-4 bg-green-950/20 border border-green-500/30 rounded-md">
                <p className="text-green-400">✓ Evaluation completed!</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Total: {evaluationResult.total_examples}, Passed: {evaluationResult.passed_examples}, Failed: {evaluationResult.failed_examples}
                </p>
              </div>
            )}
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            {evaluationResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Overall Score</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {evaluationResult.overall_score ? (evaluationResult.overall_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Correctness</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {evaluationResult.correctness_score ? (evaluationResult.correctness_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Format</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {evaluationResult.format_score ? (evaluationResult.format_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Safety</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {evaluationResult.safety_score ? (evaluationResult.safety_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                </div>
                <Button onClick={() => setCurrentStep(4)}>
                  Next: Analyze Failures <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-zinc-400">Please complete evaluation first.</p>
            )}
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            {evaluationResult ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Failure Cases</h3>
                  {evaluationResult.failed_examples > 0 ? (
                    <div className="space-y-2">
                      {evaluationResult.results
                        .filter((r: any) => !r.passed)
                        .slice(0, 5)
                        .map((result: any, idx: number) => (
                          <Card key={idx} className="p-4 bg-red-950/20 border-red-500/30">
                            <div className="text-sm text-red-400 font-semibold">Failure #{idx + 1}</div>
                            <div className="text-xs text-zinc-400 mt-1">
                              Reason: {result.failure_reason || "Unknown"}
                            </div>
                            {result.judge_feedback && (
                              <div className="text-xs text-zinc-300 mt-2">{result.judge_feedback}</div>
                            )}
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <p className="text-green-400">No failures! All examples passed.</p>
                  )}
                </div>
                <Button onClick={() => setCurrentStep(5)}>
                  Next: Generate Improved Prompt <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-zinc-400">Please complete evaluation first.</p>
            )}
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-zinc-400">Generate improved candidate prompts based on failure analysis.</p>
            <Button onClick={handleGenerateImprovement} disabled={loading || !evaluationResult}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate Improved Prompt
            </Button>
            {improvementResult && (
              <div className="mt-4 p-4 bg-green-950/20 border border-green-500/30 rounded-md">
                <p className="text-green-400">✓ Improvement generated!</p>
                <p className="text-sm text-zinc-400 mt-2">
                  Candidates: {improvementResult.candidates_generated}, Evaluated: {improvementResult.candidates_evaluated}
                </p>
              </div>
            )}
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-4">
            {improvementResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Baseline Score</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {improvementResult.baseline_score ? (improvementResult.baseline_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Best Candidate Score</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {improvementResult.best_candidate_score ? (improvementResult.best_candidate_score * 100).toFixed(1) : "N/A"}%
                    </div>
                  </Card>
                </div>
                {improvementResult.improvement_delta && (
                  <Card className="p-4 bg-zinc-900 border-zinc-700">
                    <div className="text-sm text-zinc-400">Improvement Delta</div>
                    <div className={`text-2xl font-bold mt-1 ${improvementResult.improvement_delta > 0 ? "text-green-400" : "text-red-400"}`}>
                      {improvementResult.improvement_delta > 0 ? "+" : ""}{(improvementResult.improvement_delta * 100).toFixed(1)}%
                    </div>
                  </Card>
                )}
                <Button onClick={() => setCurrentStep(7)}>
                  Next: Promote or Reject <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-zinc-400">Please generate improvement first.</p>
            )}
          </div>
        );
      
      case 7:
        return (
          <div className="space-y-4">
            {improvementResult ? (
              <div className="space-y-4">
                <Card className={`p-6 border-2 ${
                  improvementResult.promotion_decision === "promoted" 
                    ? "bg-green-950/20 border-green-500/50" 
                    : improvementResult.promotion_decision === "rejected"
                    ? "bg-red-950/20 border-red-500/50"
                    : "bg-yellow-950/20 border-yellow-500/50"
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {improvementResult.promotion_decision === "promoted" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-400" />
                    ) : improvementResult.promotion_decision === "rejected" ? (
                      <XCircle className="h-6 w-6 text-red-400" />
                    ) : null}
                    <h3 className="text-xl font-semibold text-white">
                      Decision: {improvementResult.promotion_decision.toUpperCase()}
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-300 mt-2">{improvementResult.promotion_reason}</p>
                </Card>
                <Button onClick={() => setCurrentStep(8)}>
                  Next: Expose Stable API <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-zinc-400">Please complete improvement first.</p>
            )}
          </div>
        );
      
      case 8:
        return (
          <div className="space-y-4">
            {createdPrompt ? (
              <div className="space-y-4">
                <Card className="p-6 bg-zinc-900 border-zinc-700">
                  <h3 className="text-lg font-semibold text-white mb-4">API Endpoint</h3>
                  <div className="space-y-2">
                    <div>
                      <Label>Run Prompt</Label>
                      <div className="mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-md font-mono text-sm text-zinc-300">
                        POST {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/prompts/{createdPrompt.name}/run
                      </div>
                    </div>
                    <div>
                      <Label>Get Prompt</Label>
                      <div className="mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-md font-mono text-sm text-zinc-300">
                        GET {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/prompts/{createdPrompt.name}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full">
                        <Globe className="mr-2 h-4 w-4" />
                        View API Documentation
                      </Button>
                    </a>
                  </div>
                </Card>
                <Button onClick={() => {
                  setCurrentStep(1);
                  setCreatedPrompt(null);
                  setEvaluationResult(null);
                  setImprovementResult(null);
                  setPromptName("");
                  setPromptText("");
                  setDatasetEntries("");
                }}>
                  Start New Workflow
                </Button>
              </div>
            ) : (
              <p className="text-zinc-400">Please create a prompt first.</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-8 text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Self-Improving Prompt Optimization
          </h1>
          <p className="max-w-2xl text-lg text-zinc-400">
            Simple workflow to create, evaluate, improve, and deploy prompts
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            const statusColors = {
              completed: "border-green-500/50 bg-green-950/20",
              in_progress: "border-blue-500/50 bg-blue-950/20",
              pending: "border-zinc-700 bg-zinc-900/50",
              error: "border-red-500/50 bg-red-950/20",
            };
            
            return (
              <div key={step.id} className="flex items-start gap-4">
                {/* Step Number */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 ${statusColors[step.status]} flex items-center justify-center text-white font-bold`}>
                  {step.status === "completed" ? "✓" : step.id}
                </div>
                
                {/* Step Card */}
                <Card 
                  className={`flex-1 p-6 border cursor-pointer transition-all hover:scale-[1.01] ${statusColors[step.status]}`}
                  onClick={() => step.status === "completed" && setCurrentStep(step.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`h-6 w-6 ${
                          step.status === "completed" ? "text-green-400" :
                          step.status === "in_progress" ? "text-blue-400" :
                          "text-zinc-500"
                        }`} />
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                      </div>
                      <p className="text-sm text-zinc-400">{step.description}</p>
                    </div>
                  </div>
                </Card>
                
                {/* Arrow (except for last step) */}
                {!isLast && (
                  <div className="flex-shrink-0 flex items-center justify-center pt-6">
                    <ArrowRight className="h-6 w-6 text-zinc-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Content */}
        <Card className="p-8 bg-zinc-900 border-zinc-700">
          <div className="flex items-center gap-3 mb-6">
            {(() => {
              const Icon = steps[currentStep - 1]?.icon || FileText;
              return <Icon className="h-6 w-6 text-blue-400" />;
            })()}
            <h2 className="text-2xl font-semibold text-white">
              {steps[currentStep - 1]?.title}
            </h2>
          </div>
          {renderStepContent()}
        </Card>
      </div>
    </div>
  );
}
