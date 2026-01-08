/**
 * API Client for FastAPI Backend
 * Handles all HTTP requests to the prompt optimization API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// Prompt Types
export interface PromptCreate {
  name: string;
  version: string;
  template_text: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_version_id?: number;
  status?: "draft" | "active" | "archived";
}

export interface PromptResponse {
  id: number;
  name: string;
  version: string;
  template_text: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_version_id?: number | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface PromptRunRequest {
  input_data: Record<string, any>;
  version?: string;
  model_override?: string;
  temperature_override?: number;
}

export interface PromptRunResponse {
  prompt_id: number;
  prompt_name: string;
  prompt_version: string;
  output: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PromptVersionResponse {
  id: number;
  version: string;
  status: "draft" | "active" | "archived";
  parent_version_id?: number | null;
  created_at: string;
  updated_at: string;
}

// Evaluation Types
export interface EvaluationRequest {
  dataset_id?: number;
  dataset_entries?: Array<{
    input_data: Record<string, any>;
    expected_output?: Record<string, any>;
    rubric?: string;
  }>;
  version?: string;
  evaluation_dimensions?: string[];
}

export interface EvaluationResultResponse {
  id: number;
  input_data: Record<string, any>;
  expected_output?: Record<string, any>;
  actual_output?: Record<string, any>;
  correctness_score?: number;
  format_score?: number;
  verbosity_score?: number;
  safety_score?: number;
  consistency_score?: number;
  overall_score?: number;
  passed_format_validation: boolean;
  format_validation_error?: string;
  judge_feedback?: string;
  passed: boolean;
  failure_reason?: string;
}

export interface EvaluationResponse {
  id: number;
  prompt_id: number;
  prompt_name: string;
  prompt_version: string;
  dataset_id?: number;
  evaluation_type: string;
  overall_score?: number;
  correctness_score?: number;
  format_score?: number;
  verbosity_score?: number;
  safety_score?: number;
  consistency_score?: number;
  total_examples: number;
  passed_examples: number;
  failed_examples: number;
  format_pass_rate?: number;
  failure_cases?: Array<Record<string, any>>;
  created_at: string;
  completed_at?: string;
  results: EvaluationResultResponse[];
}

export interface ImprovementRequest {
  dataset_id?: number;
  baseline_version?: string;
  improvement_threshold?: number;
  max_candidates: number;
}

export interface ImprovementResponse {
  baseline_prompt_id: number;
  baseline_version: string;
  baseline_score?: number;
  candidates_generated: number;
  candidates_evaluated: number;
  best_candidate_id?: number;
  best_candidate_version?: string;
  best_candidate_score?: number;
  improvement_delta?: number;
  promotion_decision: "promoted" | "rejected" | "pending";
  promotion_reason: string;
  created_at: string;
}

// Dataset Types
export interface DatasetCreate {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  entries?: Array<{
    input_data: Record<string, any>;
    expected_output?: Record<string, any>;
    rubric?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface DatasetResponse {
  id: number;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  entry_count: number;
}

export interface PromptDiffResponse {
  version_a: string;
  version_b: string;
  diff_text: string;
  changes_summary: string;
  added_lines: string[];
  removed_lines: string[];
}

// API Client Functions
export const apiClient = {
  // Prompts
  prompts: {
    list: (): Promise<PromptResponse[]> =>
      fetchApi<PromptResponse[]>("/prompts"),

    create: (data: PromptCreate): Promise<PromptResponse> =>
      fetchApi<PromptResponse>("/prompts", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (name: string, version?: string): Promise<PromptResponse> => {
      const params = version ? `?version=${encodeURIComponent(version)}` : "";
      return fetchApi<PromptResponse>(`/prompts/${encodeURIComponent(name)}${params}`);
    },

    run: (name: string, data: PromptRunRequest): Promise<PromptRunResponse> =>
      fetchApi<PromptRunResponse>(`/prompts/${encodeURIComponent(name)}/run`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getVersions: (name: string): Promise<PromptVersionResponse[]> =>
      fetchApi<PromptVersionResponse[]>(`/prompts/${encodeURIComponent(name)}/versions`),

    getDiff: (versionAId: number, versionBId: number): Promise<PromptDiffResponse> =>
      fetchApi<PromptDiffResponse>(`/diffs/${versionAId}/${versionBId}`),
  },

  // Evaluations
  evaluations: {
    evaluate: (name: string, data: EvaluationRequest): Promise<EvaluationResponse> =>
      fetchApi<EvaluationResponse>(`/evaluations/prompts/${encodeURIComponent(name)}/evaluate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (id: number): Promise<EvaluationResponse> =>
      fetchApi<EvaluationResponse>(`/evaluations/${id}`),

    improve: (name: string, data: ImprovementRequest): Promise<ImprovementResponse> =>
      fetchApi<ImprovementResponse>(`/evaluations/prompts/${encodeURIComponent(name)}/improve`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Datasets
  datasets: {
    list: (): Promise<DatasetResponse[]> =>
      fetchApi<DatasetResponse[]>("/datasets"),

    create: (data: DatasetCreate): Promise<DatasetResponse> =>
      fetchApi<DatasetResponse>("/datasets", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (id: number): Promise<DatasetResponse> =>
      fetchApi<DatasetResponse>(`/datasets/${id}`),
  },
};

export { ApiError };

