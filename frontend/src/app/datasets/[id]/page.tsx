"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, DatasetResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, ChevronUp } from "lucide-react";
import Link from "next/link";

function getTimeAgo(date: string): string {
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
}

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (datasetId) {
      loadDataset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      const datasetData = await apiClient.datasets.get(parseInt(datasetId));
      setDataset(datasetData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load dataset";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      router.push("/datasets");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6">
            <p className="text-zinc-400">Loading dataset...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6">
            <p className="text-zinc-400">Dataset not found</p>
            <Link href="/datasets">
              <Button className="mt-4">Back to Datasets</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const entries = dataset.entries || [];
  const promptName = dataset.metadata?.prompt_name as string || dataset.metadata?.task as string || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="bg-white rounded-lg shadow-sm border border-zinc-200 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-3">{dataset.name}</h1>
              <div className="flex items-center gap-4 text-sm text-zinc-600">
                {promptName && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs font-medium">
                    {promptName}
                  </span>
                )}
                <span>{dataset.entry_count} entries</span>
                <span>Created {getTimeAgo(dataset.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs font-medium">
                {entries.length} cases
              </span>
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-700">
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Input</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Rubric/Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-zinc-100">
                      <td className="py-4 px-4 text-sm text-zinc-600">{idx + 1}</td>
                      <td className="py-4 px-4">
                        <pre className="text-xs font-mono text-zinc-800 bg-zinc-50 p-2 rounded overflow-x-auto max-w-md">
                          {JSON.stringify(entry.input_data, null, 2)}
                        </pre>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-zinc-700">
                          {entry.rubric && (
                            <p className="mb-2">{entry.rubric}</p>
                          )}
                          {entry.expected_output && (
                            <pre className="text-xs font-mono text-zinc-600 bg-zinc-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(entry.expected_output, null, 2)}
                            </pre>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500">No entries in this dataset</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

