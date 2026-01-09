"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function HealthCheck({ children }: { children: React.ReactNode }) {
  const [healthStatus, setHealthStatus] = useState<"checking" | "healthy" | "unhealthy">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.health();
        setHealthStatus("healthy");
        setError(null);
      } catch (err) {
        setHealthStatus("unhealthy");
        setError(err instanceof Error ? err.message : "Backend unavailable");
      }
    };

    checkHealth();
  }, []);

  if (healthStatus === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            <span className="text-white">Checking backend connection...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (healthStatus === "unhealthy") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Backend Unavailable</h2>
              <p className="text-zinc-400 mb-4">
                Unable to connect to the API backend. Please ensure the backend server is running.
              </p>
              {error && (
                <p className="text-sm text-red-400 mb-4">Error: {error}</p>
              )}
              <p className="text-sm text-zinc-500">
                Expected API URL: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

