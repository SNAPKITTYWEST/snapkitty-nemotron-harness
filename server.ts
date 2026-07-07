import express from "express";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config();

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: "10mb" }));

const SWIPL = process.env.SWIPL_PATH ?? "swipl";
const LEAN = process.env.LEAN_PATH ?? "lake";
const WORKSPACE = process.env.WORKSPACE ?? process.cwd();

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
  const target = leanPath ?? WORKSPACE;
  try {
    // Run lake build
    const { stdout: buildOut, stderr: buildErr } = await execFileAsync(LEAN, ["build"], {
      cwd: target,
      timeout: 120_000,
      encoding: "utf8",
    }).catch((e) => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? e.message }));

    // Scan for sorry/admit/axiom/opaque
    let scanResult = "";
    try {
      const { stdout } = await execFileAsync("rg", [
        "-n", "--no-heading",
        "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b",
        target,
        "--glob", "*.lean",
      ], { encoding: "utf8", timeout: 30_000 });
      scanResult = stdout;
    } catch {
      scanResult = "(rg not found or no matches)";
    }

    const hasSorry = /\bsorry\b/.test(scanResult);
    const hasAdmit = /\badmit\b/.test(scanResult);
    const hasAxiom = /\baxiom\b/.test(scanResult);
    const hasOpaque = /\bopaque\b/.test(scanResult);
    const buildOk = buildErr.includes("error") ? false : true;

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
      scan: { sorry: hasSorry, admit: hasAdmit, axiom: hasAxiom, opaque: hasOpaque, raw: scanResult.slice(0, 4000) },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Prolog Gate ─────────────────────────────────────────────────────────────
app.post("/api/prolog", async (req, res) => {
  const { query, file } = req.body;
  const kernelFile = file ?? join(WORKSPACE, "kernel", "syscalls.pl");
  try {
    const q = query ?? "true";
    const { stdout, stderr } = await execFileAsync(SWIPL, [
      "-g", q,
      "-t", "halt.",
      kernelFile,
    ], { encoding: "utf8", timeout: 15_000 });
    res.json({ success: true, output: stdout.trim() || stderr.trim() });
  } catch (e: any) {
    res.json({ success: false, output: e.message });
  }
});

// ── Bash Sandbox ────────────────────────────────────────────────────────────
const BASH_DENY = [/rm\s+-rf/, /sudo/, /chmod/, /chown/, /passwd/, /curl/, /wget/, /ssh/, /scp/];

app.post("/api/bash", async (req, res) => {
  const { command, approve } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", command });

  const denied = BASH_DENY.find((rx) => rx.test(command));
  if (denied) return res.json({ status: "DENIED", reason: `blocked pattern: ${denied}` });

  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], {
      cwd: WORKSPACE,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
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

// ── Search (Tavily / Google) ────────────────────────────────────────────────
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
      // Fallback: duckduckgo lite
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

// ── File Read ───────────────────────────────────────────────────────────────
app.post("/api/file/read", (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: "path required" });
  const full = join(WORKSPACE, filePath);
  if (!existsSync(full)) return res.json({ exists: false });
  try {
    const content = readFileSync(full, "utf8");
    res.json({ exists: true, content: content.slice(0, 100000) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);
app.listen(PORT, () => console.log(`[harness] server on :${PORT}`));
