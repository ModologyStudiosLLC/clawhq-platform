// Config types for the ClawHQ model router.
// Stored under `modelRouter` in openclaw.json.

export type TaskType = "code" | "research" | "summary" | "creative" | "chat";

/** Per-task-type model override. Uses "provider/model" string format. */
export type TaskTypeOverrides = Partial<Record<TaskType, string>>;

export type ModelRouterConfig = {
  /**
   * Master switch. When false the router is bypassed and OpenClaw's default
   * model selection applies. Default: true.
   */
  enabled?: boolean;

  /**
   * Primary model used for most tasks. Format: "provider/model".
   * Example: "anthropic/claude-sonnet-4-6"
   */
  primaryModel?: string;

  /**
   * Fallback model used when budget threshold is exceeded.
   * Format: "provider/model". Example: "anthropic/claude-haiku-4-5".
   */
  fallbackModel?: string;

  /**
   * Budget percentage (0–100) at which non-critical tasks switch to the
   * fallback model. Default: 80.
   */
  budgetThreshold?: number;

  /**
   * Whether to detect a running Ollama instance and route cheap tasks there.
   * Default: true.
   */
  ollamaEnabled?: boolean;

  /**
   * Ollama base URL. Default: "http://localhost:11434".
   */
  ollamaBaseUrl?: string;

  /**
   * Local model to use for background/cheap tasks when Ollama is detected.
   * Default: "llama3.2".
   */
  ollamaModel?: string;

  /**
   * Per-task-type model overrides. These take priority over all other routing
   * rules except an explicit per-session model selection by the user.
   */
  taskTypeOverrides?: TaskTypeOverrides;

  /**
   * Whether to record per-task outcomes and adjust routing over time.
   * Self-learning data is stored at ~/.openclaw/model-router-stats.json.
   * Default: true.
   */
  selfLearning?: boolean;

  /**
   * Minimum number of samples required before self-learning can override the
   * default routing table for a task type. Default: 20.
   */
  selfLearningSampleThreshold?: number;

  /**
   * Task types whose routing the user has locked (self-learning will not
   * override these). Example: ["code", "creative"].
   */
  lockedTaskTypes?: TaskType[];
};
