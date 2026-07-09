import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type HarnessConfig = {
  mode: "local" | "browser";
  model: {
    provider: "ollama";
    baseUrl: string;
    model: string;
    temperature: number;
    seed: number;
  };
  persona: {
    executorMode: boolean;
    emojiCode: boolean;
    suppressClarificationDrag: boolean;
  };
  tools: Record<string, boolean>;
  security: {
    bashRequiresApproval: boolean;
    curlRequiresApproval: boolean;
    allowWrite: boolean;
    workspaceOnly: boolean;
  };
  receipts: {
    enabled: boolean;
    dir: string;
    hash: "sha256" | "blake3";
  };
};

const DEFAULT_CONFIG: HarnessConfig = {
  mode: "local",
  model: {
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "snapkitty-nemotron",
    temperature: 0,
    seed: 42
  },
  persona: {
    executorMode: true,
    emojiCode: true,
    suppressClarificationDrag: true
  },
  tools: {
    lean4: true,
    prolog: true,
    tavily: false,
    google: false,
    curl: false,
    bash: false
  },
  security: {
    bashRequiresApproval: true,
    curlRequiresApproval: true,
    allowWrite: false,
    workspaceOnly: true
  },
  receipts: {
    enabled: true,
    dir: "./receipts",
    hash: "sha256"
  }
};

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof out[key] === "object" && out[key] !== null) {
      out[key] = deepMerge(out[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export function loadHarnessConfig(configPath = "harness.config.json"): HarnessConfig {
  const absolute = resolve(configPath);
  const fileConfig = existsSync(absolute)
    ? JSON.parse(readFileSync(absolute, "utf8")) as Partial<HarnessConfig>
    : {};
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
  merged.model.baseUrl = process.env.OLLAMA_BASE_URL ?? merged.model.baseUrl;
  merged.model.model = process.env.OLLAMA_MODEL ?? merged.model.model;
  merged.model.temperature = Number(process.env.OLLAMA_TEMPERATURE ?? merged.model.temperature);
  merged.model.seed = Number(process.env.OLLAMA_SEED ?? merged.model.seed);
  if (process.env.RECEIPTS_DIR) merged.receipts.dir = process.env.RECEIPTS_DIR;
  return merged;
}
