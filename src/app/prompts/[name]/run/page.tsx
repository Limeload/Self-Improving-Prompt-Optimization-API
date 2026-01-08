"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, PromptRunRequest, PromptRunResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { JSONEditor } from "@/components/prompts";
import { ArrowLeft, Play, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function RunInferencePage() {
  const params = useParams();
  const router = useRouter();
  const promptName = params.name as string;
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [output, setOutput] = useState<PromptRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRun = async () => {
    try {
      setLoading(true);
      setValidationError(null);

      const request: PromptRunRequest = {
        input_data: inputData,
      };

      const result = await apiClient.prompts.run(promptName, request);
      setOutput(result);
      toast({
        title: "Success",
        description: "Inference completed successfully",
      });
    } catch (error: any) {
      setValidationError(error.message || "Failed to run inference");
      toast({
        title: "Error",
        description: error.message || "Failed to run inference",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/prompts/${promptName}`}
            className="mb-4 inline-flex items-center text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prompt Details
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Run Inference</h1>
          <p className="text-zinc-400">Execute prompt with input data</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Input Data</CardTitle>
            </CardHeader>
            <CardContent>
              <JSONEditor
                value={inputData}
                onChange={setInputData}
                label="Input JSON"
              />
              {validationError && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-500/30 rounded">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Validation Error</span>
                  </div>
                  <p className="text-sm text-red-300 mt-1">{validationError}</p>
                </div>
              )}
              <Button
                onClick={handleRun}
                disabled={loading || Object.keys(inputData).length === 0}
                className="w-full mt-4 bg-white text-black hover:bg-zinc-200"
              >
                <Play className="mr-2 h-4 w-4" />
                {loading ? "Running..." : "Run Inference"}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Output</CardTitle>
            </CardHeader>
            <CardContent>
              {output ? (
                <div className="space-y-4">
                  {/* Success indicator */}
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Inference Successful</span>
                  </div>

                  {/* Version info */}
                  <div className="p-3 bg-zinc-900 rounded">
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p>
                        <span className="font-semibold">Prompt:</span> {output.prompt_name}
                      </p>
                      <p>
                        <span className="font-semibold">Version:</span> {output.prompt_version}
                      </p>
                      <p>
                        <span className="font-semibold">Prompt ID:</span> {output.prompt_id}
                      </p>
                    </div>
                  </div>

                  {/* Output data */}
                  <JSONEditor
                    value={output.output}
                    readOnly
                    label="Output JSON"
                  />

                  {/* Metadata */}
                  {output.metadata && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-400 mb-2">Metadata</h4>
                      <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded overflow-x-auto">
                        {JSON.stringify(output.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400">
                    {loading
                      ? "Running inference..."
                      : "Output will appear here after running inference"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

