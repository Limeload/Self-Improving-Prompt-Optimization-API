import { PromptDiffResponse } from "@/lib/api-client";
import { Card } from "@/components/ui/card";

interface DiffViewerProps {
  diff: PromptDiffResponse;
  className?: string;
}

export function DiffViewer({ diff, className }: DiffViewerProps) {
  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Version Comparison</h3>
        <div className="flex gap-4 text-sm text-zinc-400">
          <span>
            <span className="text-red-400">-</span> v{diff.version_a}
          </span>
          <span>
            <span className="text-green-400">+</span> v{diff.version_b}
          </span>
        </div>
      </div>

      {/* Summary */}
      {diff.changes_summary && (
        <Card className="p-4 mb-4 bg-zinc-900/50">
          <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
          <p className="text-sm text-zinc-300">{diff.changes_summary}</p>
        </Card>
      )}

      {/* Diff text */}
      <Card className="p-4 bg-zinc-950">
        <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
          {diff.diff_text}
        </pre>
      </Card>

      {/* Added/Removed lines breakdown */}
      {(diff.added_lines.length > 0 || diff.removed_lines.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {diff.removed_lines.length > 0 && (
            <Card className="p-4 bg-red-950/20 border-red-500/30">
              <h4 className="text-sm font-semibold text-red-400 mb-2">
                Removed ({diff.removed_lines.length} lines)
              </h4>
              <div className="space-y-1">
                {diff.removed_lines.slice(0, 10).map((line, idx) => (
                  <div key={idx} className="text-xs text-red-300 font-mono">
                    - {line}
                  </div>
                ))}
                {diff.removed_lines.length > 10 && (
                  <div className="text-xs text-red-400">
                    ... and {diff.removed_lines.length - 10} more
                  </div>
                )}
              </div>
            </Card>
          )}

          {diff.added_lines.length > 0 && (
            <Card className="p-4 bg-green-950/20 border-green-500/30">
              <h4 className="text-sm font-semibold text-green-400 mb-2">
                Added ({diff.added_lines.length} lines)
              </h4>
              <div className="space-y-1">
                {diff.added_lines.slice(0, 10).map((line, idx) => (
                  <div key={idx} className="text-xs text-green-300 font-mono">
                    + {line}
                  </div>
                ))}
                {diff.added_lines.length > 10 && (
                  <div className="text-xs text-green-400">
                    ... and {diff.added_lines.length - 10} more
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

