"use client";

import { useState, useEffect } from "react";
import { apiClient, DatasetResponse, DatasetCreate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { Plus, Trash2, Database, Sparkles } from "lucide-react";
import Link from "next/link";

interface DatasetTemplate {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  entry_count: number;
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [templates, setTemplates] = useState<DatasetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDatasets();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const datasetsList = await apiClient.datasets.list();
      setDatasets(datasetsList);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load datasets";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const templatesList = await apiClient.datasets.listTemplates();
      setTemplates(templatesList);
    } catch (error: unknown) {
      // Silently fail - templates endpoint may not be available
      console.error("Failed to load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string, templateName: string) => {
    try {
      setLoading(true);
      const dataset = await apiClient.datasets.createFromTemplate(templateId);
      toast({
        title: "Success",
        description: `Dataset "${dataset.name}" created from template`,
      });
      setShowTemplates(false);
      loadDatasets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create dataset from template";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async (data: DatasetCreate) => {
    try {
      const newDataset = await apiClient.datasets.create(data);
      toast({
        title: "Success",
        description: `Dataset ${newDataset.name} created`,
      });
      setShowCreateForm(false);
      loadDatasets();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create dataset";
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
            <h1 className="text-3xl font-bold text-white">Datasets</h1>
            <p className="mt-2 text-zinc-400">
              Manage evaluation datasets for testing prompts
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-950/20"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-white text-black hover:bg-zinc-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Dataset
            </Button>
          </div>
        </div>

        {/* Templates Section */}
        {showTemplates && (
          <Card className="mb-8 p-6 bg-zinc-900/50 border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Dataset Templates</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
                className="text-zinc-400"
              >
                Close
              </Button>
            </div>
            {loadingTemplates ? (
              <p className="text-zinc-400">Loading templates...</p>
            ) : templates.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                    onClick={() => handleCreateFromTemplate(template.id, template.name)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm">{template.name}</h3>
                      <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-1 rounded">
                        {template.entry_count} entries
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    {template.metadata.task && (
                      <span className="text-xs px-2 py-1 bg-purple-950/50 text-purple-300 rounded border border-purple-800/50">
                        {template.metadata.task as string}
                      </span>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400">No templates available</p>
            )}
          </Card>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <CreateDatasetForm
            onSubmit={handleCreateDataset}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Datasets List */}
        {loading ? (
          <Card className="p-6">
            <p className="text-zinc-400">Loading datasets...</p>
          </Card>
        ) : datasets.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Datasets</h2>
              <div className="text-sm text-zinc-400">
                {datasets.length} {datasets.length === 1 ? "dataset" : "datasets"}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {datasets.map((dataset) => (
                <Card key={dataset.id} className="p-6 bg-zinc-800/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Database className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">{dataset.name}</h3>
                      </div>
                      {dataset.description && (
                        <p className="text-sm text-zinc-400 mb-3">{dataset.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-zinc-500">
                        <span>{dataset.entry_count} entries</span>
                        <span>
                          Created {new Date(dataset.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Link href={`/datasets/${dataset.id}`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">
                No datasets yet. Create your first dataset to start evaluating prompts!
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-white text-black hover:bg-zinc-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Dataset
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateDatasetForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: DatasetCreate) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<DatasetCreate>({
    name: "",
    description: "",
    entries: [],
  });
  const [entryInput, setEntryInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse entries from JSON input
    let entries = [];
    if (entryInput.trim()) {
      try {
        const parsed = JSON.parse(entryInput);
        entries = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        alert("Invalid JSON format for entries. Please check your input.");
        return;
      }
    }
    
    onSubmit({ ...formData, entries });
  };

  const addExampleEntry = () => {
    const example = {
      input_data: { text: "Example input" },
      expected_output: { result: "Example output" },
      rubric: "Evaluate correctness and format",
    };
    setEntryInput(JSON.stringify([example], null, 2));
  };

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Create New Dataset</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-white">
            Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., sentiment_test_set"
            required
            className="mt-1 bg-zinc-800 text-white"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-white">
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of the dataset"
            rows={3}
            className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="entries" className="text-white">
              Entries (JSON format)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExampleEntry}
            >
              Add Example
            </Button>
          </div>
          <textarea
            id="entries"
            value={entryInput}
            onChange={(e) => setEntryInput(e.target.value)}
            placeholder='[{"input_data": {"text": "..."}, "expected_output": {"result": "..."}, "rubric": "..."}]'
            rows={10}
            className="mt-1 w-full rounded-md bg-zinc-800 p-3 text-white placeholder:text-zinc-500 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Enter entries as JSON array. Each entry should have input_data, optional expected_output, and optional rubric.
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

