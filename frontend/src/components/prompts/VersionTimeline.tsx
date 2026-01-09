import { useState } from "react";
import { PromptVersionResponse, PromptDiffResponse } from "@/lib/api-client";
import { apiClient } from "@/lib/api-client";
import { StatusPill } from "./StatusPill";
import { Card } from "@/components/ui/card";
import { DiffViewer } from "./DiffViewer";
import { GitBranch, CheckCircle2, Eye, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VersionTimelineProps {
  versions: PromptVersionResponse[];
  currentVersionId?: number;
  onVersionSelect?: (version: PromptVersionResponse) => void;
}

export function VersionTimeline({
  versions,
  currentVersionId,
  onVersionSelect,
}: VersionTimelineProps) {
  const [selectedDiff, setSelectedDiff] = useState<{
    versionA: PromptVersionResponse;
    versionB: PromptVersionResponse;
    diff: PromptDiffResponse | null;
    loading: boolean;
  } | null>(null);

  // Sort versions by creation date (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleViewDiff = async (versionA: PromptVersionResponse, versionB: PromptVersionResponse) => {
    setSelectedDiff({
      versionA,
      versionB,
      diff: null,
      loading: true,
    });

    try {
      const diff = await apiClient.prompts.getDiff(versionA.id, versionB.id);
      setSelectedDiff({
        versionA,
        versionB,
        diff,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load diff:", error);
      setSelectedDiff({
        versionA,
        versionB,
        diff: null,
        loading: false,
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Version History</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-800" />

        <div className="space-y-6">
          {sortedVersions.map((version) => {
            const isCurrent = version.id === currentVersionId;
            const isActive = version.status === "active";

            return (
              <div key={version.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? "bg-green-500/20 border-green-500"
                      : isCurrent
                      ? "bg-blue-500/20 border-blue-500"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <GitBranch className="h-4 w-4 text-zinc-400" />
                  )}
                </div>

                {/* Version card */}
                <Card
                  className={`flex-1 p-4 transition-colors ${
                    isCurrent ? "bg-blue-500/10 border-blue-500/50" : "hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="font-semibold text-white cursor-pointer hover:text-blue-400"
                          onClick={() => onVersionSelect?.(version)}
                        >
                          v{version.version}
                        </span>
                        <StatusPill status={version.status} />
                        {isCurrent && (
                          <span className="text-xs text-blue-400 font-medium">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 space-y-1">
                        <p>Created: {new Date(version.created_at).toLocaleString()}</p>
                        {version.parent_version_id && (
                          <p className="text-zinc-500">
                            Parent: v{versions.find((v) => v.id === version.parent_version_id)?.version || version.parent_version_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {sortedVersions.findIndex(v => v.id === version.id) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const prevVersion = sortedVersions[sortedVersions.findIndex(v => v.id === version.id) - 1];
                            handleViewDiff(prevVersion, version);
                          }}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Diff
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  Comparing v{selectedDiff.versionA.version} → v{selectedDiff.versionB.version}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDiff(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {selectedDiff.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  <span className="ml-2 text-zinc-400">Loading diff...</span>
                </div>
              ) : selectedDiff.diff ? (
                <DiffViewer diff={selectedDiff.diff} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400">Failed to load diff</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

