"use client";

import { useState, useEffect } from "react";
import { apiClient, PromptResponse, PromptCreate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { PromptCard } from "@/components/prompts";
import { Plus, Play, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const promptsList = await apiClient.prompts.list();
      setPrompts(promptsList);
      
      // Load version counts for each prompt
      const counts: Record<string, number> = {};
      await Promise.all(
        promptsList.map(async (prompt) => {
          try {
            const versions = await apiClient.prompts.getVersions(prompt.name);
            counts[prompt.name] = versions.length;
          } catch {
            counts[prompt.name] = 1;
          }
        })
      );
      setVersionCounts(counts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load prompts";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleDeletePrompt = async (prompt: PromptResponse) => {
    try {
      await apiClient.prompts.delete(prompt.name, prompt.version);
      toast({
        title: "Success",
        description: `Prompt ${prompt.name} v${prompt.version} deleted`,
      });
      loadPrompts();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete prompt";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Prompt Optimization</h1>
            <p className="mt-2 text-zinc-400">
              Manage, evaluate, and continuously improve your prompts
            </p>
          </div>
          <Link href="/prompts/create">
            <Button className="bg-white text-black hover:bg-zinc-200">
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </Link>
        </div>


        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Link href="/prompts/create">
            <Card className="cursor-pointer p-6 transition-colors hover:bg-white/[0.1]">
              <div className="flex items-center space-x-3">
                <Plus className="h-6 w-6 text-blue-400" />
                <div>
                  <h3 className="font-semibold text-white">Create Prompt</h3>
                  <p className="text-sm text-zinc-400">Add a new prompt version</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/prompts/evaluate">
            <Card className="cursor-pointer p-6 transition-colors hover:bg-white/[0.1]">
              <div className="flex items-center space-x-3">
                <Play className="h-6 w-6 text-green-400" />
                <div>
                  <h3 className="font-semibold text-white">Evaluate</h3>
                  <p className="text-sm text-zinc-400">Test prompts against datasets</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/prompts/improve">
            <Card className="cursor-pointer p-6 transition-colors hover:bg-white/[0.1]">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-6 w-6 text-purple-400" />
                <div>
                  <h3 className="font-semibold text-white">Improve</h3>
                  <p className="text-sm text-zinc-400">Auto-improve prompts</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Prompts List */}
        {loading ? (
          <Card className="p-6">
            <p className="text-zinc-400">Loading prompts...</p>
          </Card>
        ) : prompts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Prompts</h2>
              <div className="text-sm text-zinc-400">
                {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  versionCount={versionCounts[prompt.name]}
                  onDelete={handleDeletePrompt}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">No prompts yet. Create your first prompt to get started!</p>
              <Link href="/prompts/create">
                <Button className="bg-white text-black hover:bg-zinc-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Prompt
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}


