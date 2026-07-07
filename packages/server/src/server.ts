import express from "express";
import { runHarness } from "@snapkitty/harness";

const app = express();
app.use(express.json());

app.get("/api/test-model", async (_req, res) => {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    const data = (await response.json()) as { models?: Array<{ name: string }> };
    const model = process.env.OLLAMA_MODEL ?? "nemotron";
    res.json({ online: true, model, models: data.models ?? [] });
  } catch {
    res.json({ online: false, model: process.env.OLLAMA_MODEL ?? "unknown", models: [] });
  }
});

app.post("/api/run", async (req, res) => {
  const { prompt, seal } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const result = await runHarness(prompt);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`[harness-server] listening on http://localhost:${PORT}`);
});
