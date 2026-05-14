export const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-7": "#8b5cf6",
  "claude-opus-4-5": "#8b5cf6",
  "claude-sonnet-4-6": "#6366f1",
  "claude-sonnet-4-5": "#6366f1",
  "claude-sonnet-4-5-20250929": "#6366f1",
  "claude-haiku-4-5": "#06b6d4",
  "claude-haiku-4-5-20251001": "#06b6d4",
  unknown: "#6b7280",
};

export const MODEL_SHORT: Record<string, string> = {
  "claude-opus-4-7": "Opus 4.7",
  "claude-opus-4-5": "Opus 4.5",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-sonnet-4-5": "Sonnet 4.5",
  "claude-sonnet-4-5-20250929": "Sonnet 4.5",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

export const TOOL_CATEGORIES: Record<string, string> = {
  Read: "file-ops",
  Write: "file-ops",
  Edit: "file-ops",
  Bash: "process",
  Agent: "ai-ops",
  Skill: "ai-ops",
  ToolSearch: "ai-ops",
  Task: "ai-ops",
  WebFetch: "web",
  WebSearch: "web",
};

export const TOOL_CATEGORY_COLORS: Record<string, string> = {
  "file-ops": "#06b6d4",
  process: "#f59e0b",
  "ai-ops": "#6366f1",
  web: "#10b981",
  default: "#6b7280",
};

export const HEATMAP_COLORS = [
  "#1a1a2e",
  "#312e81",
  "#4338ca",
  "#6366f1",
  "#a5b4fc",
];
