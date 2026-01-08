import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, Play, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-12 w-12 text-blue-400" />
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Self-Improving Prompt Optimization
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-zinc-400">
            CI/CD for prompts — version, evaluate, and continuously improve your prompts
            with automated testing and self-improvement.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/prompts">
            <Card className="cursor-pointer p-6 transition-all hover:bg-white/[0.1] hover:scale-105">
              <FileText className="mb-4 h-8 w-8 text-blue-400" />
              <h3 className="mb-2 text-xl font-semibold text-white">Manage Prompts</h3>
              <p className="text-sm text-zinc-400">
                Create, version, and manage your prompts with full history tracking.
              </p>
            </Card>
          </Link>

          <Link href="/prompts/evaluate">
            <Card className="cursor-pointer p-6 transition-all hover:bg-white/[0.1] hover:scale-105">
              <Play className="mb-4 h-8 w-8 text-green-400" />
              <h3 className="mb-2 text-xl font-semibold text-white">Evaluate</h3>
              <p className="text-sm text-zinc-400">
                Test prompts against datasets with deterministic and LLM-based evaluation.
              </p>
            </Card>
          </Link>

          <Link href="/prompts/improve">
            <Card className="cursor-pointer p-6 transition-all hover:bg-white/[0.1] hover:scale-105">
              <TrendingUp className="mb-4 h-8 w-8 text-purple-400" />
              <h3 className="mb-2 text-xl font-semibold text-white">Auto-Improve</h3>
              <p className="text-sm text-zinc-400">
                Automatically generate and promote better-performing prompt versions.
              </p>
            </Card>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">Key Features</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-2 font-semibold text-white">Version Control</h3>
              <p className="text-sm text-zinc-400">
                Every prompt change creates a new version with full lineage tracking and diffs.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="mb-2 font-semibold text-white">Multi-Dimensional Evaluation</h3>
              <p className="text-sm text-zinc-400">
                Evaluate correctness, format, verbosity, safety, and consistency with both
                deterministic and LLM-based judges.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="mb-2 font-semibold text-white">Self-Improvement Loop</h3>
              <p className="text-sm text-zinc-400">
                Automatically analyze failures, generate improved candidates, and promote
                better versions based on configurable thresholds.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="mb-2 font-semibold text-white">Full Transparency</h3>
              <p className="text-sm text-zinc-400">
                Every change is auditable with diffs, changelogs, and human-readable
                promotion decisions.
              </p>
            </Card>
          </div>
        </div>

        {/* API Docs Link */}
        <div className="mt-16 text-center">
          <Card className="inline-block p-6">
            <p className="mb-4 text-zinc-400">
              Explore the full API documentation
            </p>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              http://localhost:8000/docs →
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
