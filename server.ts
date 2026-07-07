import express from "express";
import { config } from "dotenv";
import { runHarness } from "./src/harness.js";
import { loadTrustDeed } from "./src/trustDeed.js";
import { routeSyscall } from "./src/router.js";

config();
const app = express();
app.use(express.json({ limit: "10mb" }));

const deed = loadTrustDeed();

// ── Ollama ─────────────────────────────────────────────────────────────────
app.post("/api/ollama", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "nemotron-mini";
  const systemPrompt = `You are a compute resource inside the SnapKitty harness. You are not the authority.
RULES:
1. Do not ask clarification questions.
2. Make the safest bounded assumption.
3. Emit syscall tokens when crossing authority boundaries.
4. Mark uncertainty as SPEC or OBLIGATION.
OUTPUT FORMAT:
decision: [APPROVED|REWRITE_NEEDED|REJECTED]
assumptions: [list]
syscalls: [<|token|>, ...]
next_action: [action]
output: [your response]
USER TASK: ${prompt}`;
  try {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "system", content: systemPrompt }],
        stream: false,
        options: { temperature: 0, top_p: 0.1, seed: 42 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const json = (await r.json()) as { message?: { content?: string } };
    const rawOutput = json.message?.content ?? "";
    const result = await runHarness(rawOutput);
    res.json({ raw: rawOutput, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ollama/raw", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "nemotron-mini";
  try {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0, top_p: 0.1, seed: 42 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const json = (await r.json()) as { message?: { content?: string } };
    res.json({ output: json.message?.content ?? "", model: modelName });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/ollama/test", async (_req, res) => {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  try {
    const r = await fetch(`${baseUrl}/api/tags`);
    const json = (await r.json()) as { models?: Array<{ name: string }> };
    res.json({ online: true, models: (json.models ?? []).map((m) => m.name) });
  } catch {
    res.json({ online: false, models: [] });
  }
});

// ── Route syscalls through harness ─────────────────────────────────────────
app.post("/api/route", async (req, res) => {
  const { syscall, params } = req.body;
  if (!syscall) return res.status(400).json({ error: "syscall required" });
  const result = await routeSyscall(syscall, params ?? {});
  res.json(result);
});

// ── Gate check (no Ollama, just gate raw text) ─────────────────────────────
app.post("/api/gate", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  const result = await runHarness(text);
  res.json(result);
});

// ── Trust Deed ─────────────────────────────────────────────────────────────
app.get("/api/trust-deed", (_req, res) => {
  res.json(deed);
});

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`Harness server on :${process.env.PORT ?? 3001}`);
  console.log(`Trust Deed: ${deed.name} v${deed.version}`);
  console.log(`Authority: ${deed.authority}`);
  console.log(`Model Role: ${deed.model_role}`);
});
