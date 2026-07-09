export type OllamaModel = {
  name: string;
  model: string;
  details?: {
    family?: string;
    parameter_size?: string;
    context_length?: number;
  };
};

type OllamaTagsResponse = {
  models?: OllamaModel[];
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export async function listOllamaModels(baseUrl: string): Promise<OllamaModel[]> {
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama tags request failed (${response.status})`);
  }
  const json = await response.json() as OllamaTagsResponse;
  return json.models ?? [];
}

export function resolvePreferredModel(available: OllamaModel[], requested?: string, configured?: string): string {
  const names = new Set(available.flatMap(model => [model.name, model.model]));
  const candidates = [
    requested,
    requested ? `${requested}:latest` : undefined,
    configured,
    configured ? `${configured}:latest` : undefined,
    "snapkitty-nemotron",
    "snapkitty-nemotron:latest",
    "snapkitty-harness",
    "snapkitty-harness:latest",
    "nemotron-mini",
    "nemotron-mini:latest"
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (names.has(candidate)) return candidate;
  }

  if (available.length) {
    return available[0].name || available[0].model;
  }

  throw new Error("No Ollama models available");
}

export async function chatWithOllama(
  baseUrl: string,
  model: string,
  prompt: string,
  options: { temperature: number; seed: number }
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        temperature: options.temperature,
        top_p: 0.1,
        seed: options.seed
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama chat request failed (${response.status})`);
  }

  const json = await response.json() as OllamaChatResponse;
  return json.message?.content ?? "";
}
