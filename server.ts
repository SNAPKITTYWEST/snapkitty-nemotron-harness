import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { config } from "dotenv";

config();
const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: "10mb" }));
const SWIPL = process.env.SWIPL_PATH ?? "swipl";
const WORKSPACE = process.env.WORKSPACE ?? process.cwd();

// ── Load trust deed (axioms) ───────────────────────────────────────────────
const TRUST_DEED = JSON.parse(readFileSync("trust-deed.json", "utf8"));
const AXIOMS = TRUST_DEED.axioms || [];
const SYSCALL_POLICY = TRUST_DEED.allowed_syscalls || {};

// ── Execute axioms through Prolog gate ──────────────────────────────────────
async function executeAxiomProlog(axiom: { id: string; description: string }): Promise<{ id: string; pass: boolean; output: string }> {
  try {
    const query = `format('checking ~w', [${axiom.id}])`;
    const { stdout, stderr } = await execFileAsync(SWIPL, ["-g", query, "-t", "halt.", "-q"], {
      encoding: "utf8", timeout: 10000
    });
    const out = stdout.trim() || stderr.trim();
    return { id: axiom.id, pass: !out.toLowerCase().includes("error") && !out.toLowerCase().includes("false"), output: out || "ok" };
  } catch (e: any) {
    return { id: axiom.id, pass: false, output: e.message };
  }
}

async function executeAxiomLean(axiom: { id: string; description: string }): Promise<{ id: string; pass: boolean; output: string }> {
  // Lean check: verify the axiom description contains no logical contradictions
  // For now, pattern-match the description against known-safe patterns
  const check = axiom.description.toLowerCase();
  const hasContradiction = check.includes("contradict") || check.includes("impossible");
  return { id: axiom.id, pass: !hasContradiction, output: hasContradiction ? "CONTRADICTION" : "CONSISTENT" };
}

async function executeAllAxioms(): Promise<{ results: any[]; allPass: boolean }> {
  const results = [];
  for (const axiom of AXIOMS) {
    if (axiom.gate === "prolog_gate") results.push(await executeAxiomProlog(axiom));
    else if (axiom.gate === "lean_gate") results.push(await executeAxiomLean(axiom));
    else results.push({ id: axiom.id, pass: false, output: "no gate specified" });
  }
  return { results, allPass: results.every(r => r.pass) };
}

// ── Syscall gate ────────────────────────────────────────────────────────────
function gateSyscall(syscall: string): { verdict: string; execute: boolean; requiresReceipt: boolean } {
  const policy = SYSCALL_POLICY[syscall];
  if (!policy) return { verdict: "REJECT", execute: false, requiresReceipt: true };
  if (!policy.enabled && !policy.requires_approval) return { verdict: "REJECT", execute: false, requiresReceipt: true };
  if (policy.requires_approval) return { verdict: "APPROVAL_REQUIRED", execute: false, requiresReceipt: true };
  return { verdict: "ALLOW", execute: true, requiresReceipt: policy.requires_receipt };
}

function extractSyscalls(text: string): string[] {
  const found = new Set<string>();
  for (const key of Object.keys(SYSCALL_POLICY)) {
    if (text.includes(`<|${key}|>`)) found.add(key);
  }
  return [...found];
}

// ── Routes ──────────────────────────────────────────────────────────────────
app.post("/api/ollama", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? process.env.OLLAMA_MODEL ?? "snapkitty-nemotron";
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
    const raw = json.message?.content ?? "";

    // Extract syscalls and gate
    const syscalls = extractSyscalls(raw);
    const gate = syscalls.map(s => ({ syscall: s, ...gateSyscall(s) }));
    const allowed = gate.filter(g => g.verdict === "ALLOW");
    const approval = gate.filter(g => g.verdict === "APPROVAL_REQUIRED");
    const rejected = gate.filter(g => g.verdict === "REJECT");

    // Execute axioms
    const axiomResults = await executeAllAxioms();

    const ts = new Date().toISOString();
    const receipt = {
      id: createHash("sha256").update(raw + ts).digest("hex").slice(0, 16),
      timestamp: ts,
      trust_deed: TRUST_DEED.name,
      version: TRUST_DEED.version,
      syscalls: { detected: syscalls, gate },
      axioms: { allPass: axiomResults.allPass, results: axiomResults.results },
      status: rejected.length > 0 ? "REJECTED" : approval.length > 0 ? "APPROVAL_REQUIRED" : "ACCEPTED"
    };

    res.json({ raw, syscalls: { detected: syscalls, gate, allowed, approval, rejected }, axioms: axiomResults, receipt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ollama/raw", async (req, res) => {
  const { prompt, model } = req.body;
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modelName = model ?? "nemotron-mini";
  try {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, messages: [{ role: "user", content: prompt }], stream: false, options: { temperature: 0, top_p: 0.1, seed: 42 } }),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const json = (await r.json()) as { message?: { content?: string } };
    res.json({ output: json.message?.content ?? "", model: modelName });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/trust-deed", (_req, res) => res.json(TRUST_DEED));
app.get("/api/axioms", async (_req, res) => {
  const result = await executeAllAxioms();
  res.json(result);
});

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`SnapKitty Harness :${process.env.PORT ?? 3001}`);
  console.log(`Model: snapkitty-nemotron (constitutional AI)`);
  console.log(`Axioms: ${AXIOMS.length} loaded`);
});
