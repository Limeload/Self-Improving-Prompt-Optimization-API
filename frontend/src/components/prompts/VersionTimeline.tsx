import { PromptVersionResponse } from "@/lib/api-client";
import { StatusPill } from "./StatusPill";
import { Card } from "@/components/ui/card";
import { GitBranch, CheckCircle2 } from "lucide-react";

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
  // Sort versions by creation date (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
                  className={`flex-1 p-4 cursor-pointer transition-colors ${
                    isCurrent ? "bg-blue-500/10 border-blue-500/50" : "hover:bg-white/[0.05]"
                  }`}
                  onClick={() => onVersionSelect?.(version)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-white">v{version.version}</span>
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
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

