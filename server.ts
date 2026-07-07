import express from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config();

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: "10mb" }));

const SWIPL = process.env.SWIPL_PATH ?? "swipl";
const LEAN = process.env.LEAN_PATH ?? "lake";
const WORKSPACE = process.env.WORKSPACE ?? process.cwd();

const SYSTEM_PROMPT = readFileSync(join(import.meta.dirname ?? ".", "prompts", "system.snap.md"), "utf8");

function buildSystemPrompt(userPrompt: string): string {
  return SYSTEM_PROMPT.replace("{prompt}", userPrompt);
}

// ── Ollama (chat API with system message) ──────────────────────────────────
app.post("/api/ollama", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "nemotron-mini";
  try {
    const systemMsg = buildSystemPrompt(prompt);
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemMsg },
        ],
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

// ── Ollama RAW (no system prompt — for comparison) ──────────────────────────
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

// ── Lean 4 Gate ─────────────────────────────────────────────────────────────
app.post("/api/lean", async (req, res) => {
  const { path: leanPath } = req.body;
  const target = leanPath ?? join(WORKSPACE, "lean4");
  try {
    let buildOk = true;
    let buildOut = "";
    let buildErr = "";
    try {
      const r = await execFileAsync(LEAN, ["build"], {
        cwd: target, timeout: 120_000, encoding: "utf8",
      });
      buildOut = r.stdout;
      buildErr = r.stderr;
    } catch (e: any) {
      buildOk = false;
      buildOut = e.stdout ?? "";
      buildErr = e.stderr ?? e.message;
    }
    let scanRaw = "";
    try {
      const { stdout } = await execFileAsync("rg", [
        "-n", "--no-heading",
        "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b",
        target, "--glob", "*.lean",
      ], { encoding: "utf8", timeout: 30_000 });
      scanRaw = stdout;
    } catch { scanRaw = ""; }
    const hasSorry = /\bsorry\b/.test(scanRaw);
    const hasAdmit = /\badmit\b/.test(scanRaw);
    const hasAxiom = /\baxiom\b/.test(scanRaw);
    const hasOpaque = /\bopaque\b/.test(scanRaw);
    let status: string;
    if (buildOk && !hasSorry && !hasAdmit && !hasAxiom && !hasOpaque) status = "PROVED";
    else if (hasSorry || hasAdmit) status = "SPEC";
    else status = "OBLIGATION";
    res.json({
      status,
      build: { ok: buildOk, stdout: buildOut.slice(0, 4000), stderr: buildErr.slice(0, 4000) },
      scan: { sorry: hasSorry, admit: hasAdmit, axiom: hasAxiom, opaque: hasOpaque, raw: scanRaw.slice(0, 4000) },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Prolog Gate ─────────────────────────────────────────────────────────────
app.post("/api/prolog", async (req, res) => {
  const { query, file } = req.body;
  const kernelFile = file ?? join(import.meta.dirname ?? ".", "kernel", "syscalls.pl");
  try {
    const q = query ?? "true";
    const { stdout, stderr } = await execFileAsync(SWIPL, [
      "-g", q, "-t", "halt.", kernelFile,
    ], { encoding: "utf8", timeout: 15_000 });
    const output = stdout.trim() || stderr.trim();
    res.json({ success: !output.includes("error"), output, kernel: "syscalls.pl" });
  } catch (e: any) {
    res.json({ success: false, output: e.message, kernel: "syscalls.pl" });
  }
});

// ── Bash Sandbox ────────────────────────────────────────────────────────────
const BASH_DENY = [/rm\s+-rf/, /sudo/, /chmod/, /chown/, /passwd/, /curl/, /wget/, /ssh/, /scp/];
app.post("/api/bash", async (req, res) => {
  const { command, approve } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", command });
  if (BASH_DENY.some((rx) => rx.test(command))) {
    return res.json({ status: "REJECTED", command, reason: "denied pattern" });
  }
  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], {
      timeout: 30_000, encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    res.json({ status: "EXECUTED", command, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000) });
  } catch (e: any) {
    res.json({ status: "ERROR", command, error: e.message });
  }
});

// ── Curl Sandbox ────────────────────────────────────────────────────────────
app.post("/api/curl", async (req, res) => {
  const { url, approve } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", url });
  try {
    const { stdout, stderr } = await execFileAsync("curl", ["-sL", "--max-time", "15", url], {
      timeout: 20_000, encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    res.json({ status: "FETCHED", url, body: stdout.slice(0, 8000) });
  } catch (e: any) {
    res.json({ status: "ERROR", url, error: e.message });
  }
});

// ── Tavily Search ──────────────────────────────────────────────────────────
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return res.json({ status: "NO_KEY", query });
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    });
    const data = await r.json();
    res.json({ status: "FOUND", query, results: data.results ?? [] });
  } catch (e: any) {
    res.json({ status: "ERROR", query, error: e.message });
  }
});

// ── EmojiCode Decode ───────────────────────────────────────────────────────
app.post("/api/emojicode", (req, res) => {
  const { text } = req.body;
  const EMOJI_MAP: Record<string, string> = {
    "🤖": "agent_execution_mode", "🧠": "reasoning_mode", "🔒": "seal_required",
    "🧪": "test_required", "📜": "proof_status_check", "🚫": "reject_unsafe",
    "🧾": "receipt_required", "⚙️": "build_step", "🕳️": "uncertainty_SPEC",
    "✅": "verified_passed_gate",
  };
  const found = (text ?? "").match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
  const decoded = found.map((e) => ({ emoji: e, mode: EMOJI_MAP[e] ?? "unknown" }));
  res.json({ decoded });
});

// ── Gate classify ──────────────────────────────────────────────────────────
const ALLOWED = new Set([
  "lean_gate", "prolog_gate", "emojicode_persona", "file_read",
  "kernel_verify", "ere_check", "receipt_seal", "worm_seal_required",
  "build_receipt", "reject_unsealed", "executor_mode", "reject_untrusted",
  "build_check",
]);
const REQUIRES_APPROVAL = new Set(["bash_exec", "curl_fetch", "tavily_search", "google_search"]);
// everything else = REJECTED

app.post("/api/gate", (req, res) => {
  const { syscalls } = req.body;
  if (!Array.isArray(syscalls)) return res.status(400).json({ error: "syscalls array required" });
  const results = syscalls.map((s: string) => {
    if (ALLOWED.has(s)) return { syscall: s, verdict: "ALLOWED", execute: true };
    if (REQUIRES_APPROVAL.has(s)) return { syscall: s, verdict: "APPROVAL", execute: false };
    return { syscall: s, verdict: "REJECTED", execute: false };
  });
  res.json({ results });
});

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`Harness server on :${process.env.PORT ?? 3001}`);
});
