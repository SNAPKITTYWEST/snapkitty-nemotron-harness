export async function callOllama(
  baseUrl: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0, top_p: 0.1, seed: 42 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }

  const json = (await res.json()) as { response?: string };
  return json.response ?? "";
}

export async function testOllama(baseUrl: string): Promise<{
  online: boolean;
  models: string[];
}> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return { online: true, models: (data.models ?? []).map((m) => m.name) };
  } catch {
    return { online: false, models: [] };
  }
}
