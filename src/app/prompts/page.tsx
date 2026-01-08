"use client";

import { useState, useEffect } from "react";
import { apiClient, PromptResponse, PromptCreate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { PromptCard } from "@/components/prompts";
import { Plus, Play, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const promptsList = await apiClient.prompts.list();
      setPrompts(promptsList);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load prompts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (data: PromptCreate) => {
    try {
      const newPrompt = await apiClient.prompts.create(data);
      toast({
        title: "Success",
        description: `Prompt ${newPrompt.name} v${newPrompt.version} created`,
      });
      setShowCreateForm(false);
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create prompt",
        variant: "destructive",
      });
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prompt",
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
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-white text-black hover:bg-zinc-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Prompt
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <CreatePromptForm
            onSubmit={handleCreatePrompt}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

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
                  onDelete={handleDeletePrompt}
                  // TODO: Fetch and pass last evaluation score and promotion decision
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

function CreatePromptForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: PromptCreate) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<PromptCreate>({
    name: "",
    version: "1.0.0",
    template_text: "",
    status: "draft",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="mb-8 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Create New Prompt</h2>
        <Link href="/prompts/create">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            Use Full Form →
          </Button>
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
              Unique identifier for the prompt
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
              Version string (e.g., "1.0.0" or "v2")
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="template_text" className="text-white">
            Template Text *
          </Label>
          <textarea
            id="template_text"
            value={formData.template_text}
            onChange={(e) =>
              setFormData({ ...formData, template_text: e.target.value })
            }
            required
            rows={8}
            placeholder="Enter your prompt template here. Use {{variable_name}} for inputs."
            className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Use <code className="bg-zinc-900 px-1 rounded">{"{{variable_name}}"}</code> syntax for input variables
          </p>
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-white text-black hover:bg-zinc-200">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </form>
    </Card>
  );
}

