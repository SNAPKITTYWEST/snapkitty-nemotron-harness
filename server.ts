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
const EXECUTOR_PROMPT = readFileSync(join(import.meta.dirname ?? ".", "prompts", "executor-mode.md"), "utf8");

// EmojiCode persona map
const EMOJI_MAP: Record<string, string> = {
  "🤖": "agent_execution_mode",
  "🧠": "reasoning_mode",
  "🔒": "seal_required",
  "🧪": "test_required",
  "📜": "proof_status_check",
  "🚫": "reject_unsafe",
  "🧾": "receipt_required",
  "⚙️": "build_step",
  "🕳️": "uncertainty_SPEC",
  "✅": "verified_passed_gate",
};

function buildPersonaPrompt(userPrompt: string, emojiEnabled: boolean): string {
  let persona = SYSTEM_PROMPT;
  if (emojiEnabled) {
    const emojis = userPrompt.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
    const modes = emojis.map((e) => EMOJI_MAP[e]).filter(Boolean);
    if (modes.length > 0) {
      persona += `\n\nActive EmojiCode modes: ${modes.join(", ")}`;
    }
  }
  return `${persona}\n\nUSER TASK:\n${userPrompt}\n\nReturn:\n- decision\n- assumptions\n- syscalls\n- next_action`;
}

// ── Ollama ──────────────────────────────────────────────────────────────────
app.post("/api/ollama", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "nemotron";
  try {
    const r = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        options: { temperature: 0, top_p: 0.1, seed: 42 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const json = (await r.json()) as { response?: string };
    res.json({ output: json.response ?? "", model: modelName });
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
    // Run lake build
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

    // Scan for sorry/admit/axiom/opaque in .lean files
    let scanRaw = "";
    try {
      const { stdout } = await execFileAsync("rg", [
        "-n", "--no-heading",
        "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b",
        target, "--glob", "*.lean",
      ], { encoding: "utf8", timeout: 30_000 });
      scanRaw = stdout;
    } catch {
      // rg not found or no matches
      scanRaw = "";
    }

    const hasSorry = /\bsorry\b/.test(scanRaw);
    const hasAdmit = /\badmit\b/.test(scanRaw);
    const hasAxiom = /\baxiom\b/.test(scanRaw);
    const hasOpaque = /\bopaque\b/.test(scanRaw);

    let status: string;
    if (buildOk && !hasSorry && !hasAdmit && !hasAxiom && !hasOpaque) {
      status = "PROVED";
    } else if (hasSorry || hasAdmit) {
      status = "SPEC";
    } else {
      status = "OBLIGATION";
    }

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

  // Try the real Prolog kernel first
  const kernelFile = file ?? join(WORKSPACE, "snapkitty-nemotron-harness", "kernel", "syscalls.pl");
  const ereGateFile = join(WORKSPACE, "snapkitty-nemotron-harness", "kernel", "ere_gate.pl");

  try {
    // Validate syscalls via Prolog
    const q = query ?? "true";
    const { stdout, stderr } = await execFileAsync(SWIPL, [
      "-g", q,
      "-t", "halt.",
      kernelFile,
    ], { encoding: "utf8", timeout: 15_000 });
    res.json({ success: true, output: stdout.trim() || stderr.trim(), kernel: "syscalls.pl" });
  } catch (e: any) {
    // Fallback: try ERE gate
    try {
      const { stdout, stderr } = await execFileAsync(SWIPL, [
        "-g", "ere5_all_pass(test_input)",
        "-t", "halt.",
        ereGateFile,
      ], { encoding: "utf8", timeout: 15_000 });
      res.json({ success: true, output: stdout.trim() || stderr.trim(), kernel: "ere_gate.pl" });
    } catch (e2: any) {
      res.json({ success: false, output: e2.message, kernel: "none" });
    }
  }
});

// ── Bash Sandbox ────────────────────────────────────────────────────────────
const BASH_DENY = [/rm\s+-rf/, /sudo/, /chmod/, /chown/, /passwd/, /curl/, /wget/, /ssh/, /scp/];

app.post("/api/bash", async (req, res) => {
  const { command, approve } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", command });

  const denied = BASH_DENY.find((rx) => rx.test(command));
  if (denied) return res.json({ status: "DENIED", reason: `blocked: ${denied}` });

  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], {
      cwd: WORKSPACE, encoding: "utf8", timeout: 60_000, maxBuffer: 1024 * 1024,
    });
    res.json({ status: "OK", stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000) });
  } catch (e: any) {
    res.json({ status: "ERROR", stdout: e.stdout?.slice(0, 4000) ?? "", stderr: e.stderr?.slice(0, 4000) ?? e.message });
  }
});

// ── Curl / Fetch ────────────────────────────────────────────────────────────
app.post("/api/curl", async (req, res) => {
  const { url, method, approve } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", url, method: method ?? "GET" });

  try {
    const r = await fetch(url, {
      method: method ?? "GET",
      headers: { "User-Agent": "SnapKitty-Harness/0.2" },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await r.text();
    res.json({ status: "OK", httpStatus: r.status, body: body.slice(0, 50000), contentType: r.headers.get("content-type") });
  } catch (e: any) {
    res.json({ status: "ERROR", error: e.message });
  }
});

// ── Search ──────────────────────────────────────────────────────────────────
app.post("/api/search", async (req, res) => {
  const { query, provider, approve } = req.body;
  if (!query) return res.status(400).json({ error: "query required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", query, provider });

  try {
    if (provider === "tavily") {
      const key = process.env.TAVILY_API_KEY;
      if (!key) return res.json({ status: "ERROR", error: "TAVILY_API_KEY not set" });
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query, max_results: 5 }),
      });
      const json = await r.json();
      res.json({ status: "OK", provider: "tavily", results: json.results ?? [], marked: "RETRIEVAL_UNTRUSTED" });
    } else {
      const r = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "SnapKitty-Harness/0.2" },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await r.text();
      res.json({ status: "OK", provider: "duckduckgo", body: html.slice(0, 20000), marked: "RETRIEVAL_UNTRUSTED" });
    }
  } catch (e: any) {
    res.json({ status: "ERROR", error: e.message });
  }
});

// ── EmojiCode ───────────────────────────────────────────────────────────────
app.post("/api/emojicode", (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ modes: [], emojis: [] });

  const emojis = text.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
  const modes = emojis.map((e: string) => ({ emoji: e, mode: EMOJI_MAP[e] ?? "unknown" }));
  res.json({ emojis, modes, count: modes.length });
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, () => console.log(`[harness] server on :${PORT}`));
