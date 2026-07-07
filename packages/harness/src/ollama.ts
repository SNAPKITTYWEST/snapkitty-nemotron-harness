import { config } from "dotenv";

config();

export async function callOllama(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL;

  if (!model) {
    throw new Error("OLLAMA_MODEL is not set in .env");
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0,
        top_p: 0.1,
        seed: 42,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { response?: string };
  return json.response ?? "";
}
