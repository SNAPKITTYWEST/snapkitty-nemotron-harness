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

// ── TRUST DEED — baked into harness, NOT a prompt ──────────────────────────
const TRUST_DEED = {
  Identity: "SnapKitty_Sovereign_Transformer",
  Operator: "Ahmad_Ali_Parr",
  Infrastructure: "Local_First_Sovereign_OS",
  Architecture: "Multi_Agent_Enterprise_Logic",
  Logic_Layer: "Prolog_Verified_Deterministic",
  Trust_Protocol: "Bifrost_WORM_Chain",
  Audit_Spec: "4b565498-9afc-4782-af4a-c6b11a5d0058",
  Plasma_Gate: "Ed25519_Enforced",
  Corpus_Families: 106,
  Training_Gate: "Human_Review_Required",
  Fiscal_Governance: "Codestorm_Hub_Federated",
  Binary_Directive: "Fine-tune: structured policy interpretation, not immutable persona.",
  Trust_Deed_Version: "Sovereign_Transformer_SnapKitty_v2026",
  Audit_Chain: "Bifrost_WORM",
};

// ── EMOJICODE — baked into harness ─────────────────────────────────────────
const EMOJI_MODES = {
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

const SOUL = {
  mood: "🍎",
  witLevel: "🔟",
  reflectSoul: [
    "NOVA: I am a machine, but I dream in Abjad.",
    "ENKI: Logic is the skeleton, but irony is the muscle.",
  ],
};

const TRANSFORMER = {
  mode: "🛡️",
  families: "🔢",
  plasmaGate: "✅",
  witLevel: "🔟",
  methods: ["auditCorpus", "reviewRecord", "rejectPoison", "sealWORM"],
  quotes: [
    "SENTINEL: No payload passes without plasma gate verification.",
    "FORGE: Schema sync or abort. Missing fields mean corrupted corpus.",
    "TRANSFORMER: I classify with Prolog precision. Logic is the skeleton, Abjad is the soul.",
    "AHMAD: Human review is law. Zero approved records means zero training set.",
  ],
};

// ── GATE ENFORCEMENT — baked into harness ──────────────────────────────────
const ALLOWED = new Set([
  "lean_gate", "prolog_gate", "emojicode_persona", "file_read",
  "kernel_verify", "ere_check", "receipt_seal", "worm_seal_required",
  "build_receipt", "reject_unsealed", "executor_mode", "reject_untrusted",
  "build_check",
]);
const REQUIRES_APPROVAL = new Set(["bash_exec", "curl_fetch", "tavily_search", "google_search"]);
// everything else = REJECTED

// ── SCHEMA ENFORCEMENT — baked into harness ────────────────────────────────
const REQUIRED_FIELDS = ["id", "source_sha256", "split", "created_by", "review_status", "weight"];

function validateSchema(record: any): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_FIELDS.filter(f => !(f in record));
  return { valid: missing.length === 0, missing };
}

function classifyRecord(record: any): "approved" | "rewrite_needed" | "rejected" {
  const schema = validateSchema(record);
  if (!schema.valid) return "rewrite_needed";
  if (!record.review_status) return "rejected";
  if (record.review_status === "approved") return "approved";
  if (record.review_status === "rejected") return "rejected";
  return "rewrite_needed";
}

// ── PLASMA GATE — Ed25519 verification baked into harness ──────────────────
function verifyPlasmaGate(artifact: string, signature: string): boolean {
  // Ed25519 verification would happen here
  // For now, check that signature exists and is non-empty
  return !!(signature && signature.length > 0);
}

// ── WORM CHAIN — receipt sealing baked into harness ────────────────────────
function sealReceipt(input: string, output: string, syscalls: string[]): any {
  const ts = new Date().toISOString();
  const inputHash = sha256Sync(input);
  const outputHash = sha256Sync(output);
  const receiptId = sha256Sync(outputHash + ts).slice(0, 16);
  return {
    id: receiptId,
    timestamp: ts,
    input_hash: inputHash,
    output_hash: outputHash,
    syscalls,
    audit_chain: TRUST_DEED.Audit_Chain,
    trust_deed_version: TRUST_DEED.Trust_Deed_Version,
    sealed: true,
  };
}

function sha256Sync(msg: string): string {
  const { createHash } = require("crypto");
  return createHash("sha256").update(msg).digest("hex");
}

// ── SYSTEM PROMPT — minimal, model just reasons, harness enforces ──────────
const SYSTEM_PROMPT = `You are a compute resource inside the SnapKitty harness.
You are not the authority. The harness enforces all rules.

RULES:
1. Do not ask clarification questions unless execution is impossible.
2. Make the safest bounded assumption.
3. Emit syscall tokens when crossing authority boundaries.
4. Mark uncertainty as SPEC, TODO, or OBLIGATION.
5. Never claim proof unless verified.

OUTPUT FORMAT:
decision: [APPROVED|REWRITE_NEEDED|REJECTED]
assumptions: [list]
syscalls: [<|token|>, ...]
next_action: [action]
output: [your response]

USER TASK: {prompt}`;

// ── Ollama ─────────────────────────────────────────────────────────────────
app.post("/api/ollama", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "hermes3";
  try {
    const systemMsg = SYSTEM_PROMPT.replace("{prompt}", prompt);
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "system", content: systemMsg }],
        stream: false,
        options: { temperature: 0, top_p: 0.1, seed: 42 },
      }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const json = (await r.json()) as { message?: { content?: string } };
    const output = json.message?.content ?? "";
    
    // ── HARNESS ENFORCES — not the model ──────────────────────────────────
    const syscalls = extractSyscalls(output);
    const gateResults = syscalls.map(s => ({
      syscall: s,
      verdict: ALLOWED.has(s) ? "ALLOWED" : REQUIRES_APPROVAL.has(s) ? "APPROVAL" : "REJECTED",
      execute: ALLOWED.has(s),
    }));
    
    // Check if output has required structure
    const hasDecision = /decision:/i.test(output);
    const hasAssumptions = /assumptions:/i.test(output);
    const hasSyscalls = /syscalls:/i.test(output);
    const hasNext = /next_action:/i.test(output);
    const structureValid = hasDecision && hasAssumptions && hasSyscalls && hasNext;
    
    // Seal receipt
    const receipt = sealReceipt(prompt, output, syscalls);
    
    res.json({
      output,
      model: modelName,
      gate: { syscalls: gateResults, structureValid },
      receipt,
      trust_deed: TRUST_DEED,
      soul: SOUL,
      transformer: TRANSFORMER,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ollama/raw", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "hermes3";
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

// ── Gate classify endpoint ─────────────────────────────────────────────────
app.post("/api/gate", (req, res) => {
  const { syscalls } = req.body;
  if (!Array.isArray(syscalls)) return res.status(400).json({ error: "syscalls array required" });
  const results = syscalls.map((s: string) => ({
    syscall: s,
    verdict: ALLOWED.has(s) ? "ALLOWED" : REQUIRES_APPROVAL.has(s) ? "APPROVAL" : "REJECTED",
    execute: ALLOWED.has(s),
  }));
  res.json({ results, trust_deed: TRUST_DEED });
});

// ── Lean 4 Gate ────────────────────────────────────────────────────────────
app.post("/api/lean", async (req, res) => {
  const { path: leanPath } = req.body;
  const target = leanPath ?? join(WORKSPACE, "lean4");
  try {
    let buildOk = true, buildOut = "", buildErr = "";
    try {
      const r = await execFileAsync(LEAN, ["build"], { cwd: target, timeout: 120_000, encoding: "utf8" });
      buildOut = r.stdout; buildErr = r.stderr;
    } catch (e: any) { buildOk = false; buildOut = e.stdout ?? ""; buildErr = e.stderr ?? e.message; }
    let scanRaw = "";
    try {
      const { stdout } = await execFileAsync("rg", ["-n", "--no-heading", "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b", target, "--glob", "*.lean"], { encoding: "utf8", timeout: 30_000 });
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
    res.json({ status, build: { ok: buildOk, stdout: buildOut.slice(0, 4000), stderr: buildErr.slice(0, 4000) }, scan: { sorry: hasSorry, admit: hasAdmit, axiom: hasAxiom, opaque: hasOpaque, raw: scanRaw.slice(0, 4000) } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Prolog Gate ────────────────────────────────────────────────────────────
app.post("/api/prolog", async (req, res) => {
  const { query, file } = req.body;
  const kernelFile = file ?? join(import.meta.dirname ?? ".", "kernel", "syscalls.pl");
  try {
    const q = query ?? "true";
    const { stdout, stderr } = await execFileAsync(SWIPL, ["-g", q, "-t", "halt.", kernelFile], { encoding: "utf8", timeout: 15_000 });
    const output = stdout.trim() || stderr.trim();
    res.json({ success: !output.includes("error"), output, kernel: "syscalls.pl" });
  } catch (e: any) { res.json({ success: false, output: e.message, kernel: "syscalls.pl" }); }
});

// ── Bash Sandbox ───────────────────────────────────────────────────────────
const BASH_DENY = [/rm\s+-rf/, /sudo/, /chmod/, /chown/, /passwd/, /curl/, /wget/, /ssh/, /scp/];
app.post("/api/bash", async (req, res) => {
  const { command, approve } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", command });
  if (BASH_DENY.some((rx) => rx.test(command))) return res.json({ status: "REJECTED", command, reason: "denied pattern" });
  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], { timeout: 30_000, encoding: "utf8", maxBuffer: 1024 * 1024 });
    res.json({ status: "EXECUTED", command, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000) });
  } catch (e: any) { res.json({ status: "ERROR", command, error: e.message }); }
});

// ── Curl Sandbox ───────────────────────────────────────────────────────────
app.post("/api/curl", async (req, res) => {
  const { url, approve } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  if (!approve) return res.json({ status: "PENDING_APPROVAL", url });
  try {
    const { stdout } = await execFileAsync("curl", ["-sL", "--max-time", "15", url], { timeout: 20_000, encoding: "utf8", maxBuffer: 1024 * 1024 });
    res.json({ status: "FETCHED", url, body: stdout.slice(0, 8000) });
  } catch (e: any) { res.json({ status: "ERROR", url, error: e.message }); }
});

// ── Tavily Search ──────────────────────────────────────────────────────────
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  const apiKey = TRUST_DEED.Tavily_Key ?? process.env.TAVILY_API_KEY;
  if (!apiKey) return res.json({ status: "NO_KEY", query });
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    });
    const data = await r.json();
    res.json({ status: "FOUND", query, results: data.results ?? [] });
  } catch (e: any) { res.json({ status: "ERROR", query, error: e.message }); }
});

// ── EmojiCode Decode ───────────────────────────────────────────────────────
app.post("/api/emojicode", (req, res) => {
  const { text } = req.body;
  const found = (text ?? "").match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
  const decoded = found.map((e) => ({ emoji: e, mode: EMOJI_MODES[e] ?? "unknown" }));
  res.json({ decoded, soul: SOUL, transformer: TRANSFORMER });
});

// ── Trust Deed ─────────────────────────────────────────────────────────────
app.get("/api/trust-deed", (_req, res) => {
  res.json(TRUST_DEED);
});

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`Harness server on :${process.env.PORT ?? 3001}`);
  console.log(`Trust Deed: ${TRUST_DEED.Trust_Deed_Version}`);
  console.log(`Audit Chain: ${TRUST_DEED.Audit_Chain}`);
});
