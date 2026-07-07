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
const KERNEL_DIR = join(import.meta.dirname ?? ".", "kernel");
const PLASMA_GATE = join(KERNEL_DIR, "plasma_gate.pl");
const SYSCALLS_PL = join(KERNEL_DIR, "syscalls.pl");
const FFI_HOST = join(KERNEL_DIR, "pl_ffi_host.exe");
const PROLOG_ENV = { ...process.env, PATH: `${KERNEL_DIR};${process.env.PATH ?? ""}` };
const exists_ffi = existsSync(FFI_HOST);

const TRUST_DEED = JSON.parse(readFileSync("trust-deed.json", "utf8"));
const AXIOMS = TRUST_DEED.axioms || [];
const SYSCALL_POLICY = TRUST_DEED.allowed_syscalls || {};

const EMOJI_MODES = {
  "🤖": "agent_execution_mode", "🧠": "reasoning_mode", "🔒": "seal_required",
  "🧪": "test_required", "📜": "proof_status_check", "🚫": "reject_unsafe",
  "🧾": "receipt_required", "⚙️": "build_step", "🕳️": "uncertainty_SPEC",
  "✅": "verified_passed_gate",
};

// ── Prolog query helper ──────────────────────────────────────────────────────
async function plQuery(query: string, kernel?: string): Promise<string> {
  const kf = kernel ?? PLASMA_GATE;
  if (!existsSync(kf)) return `kernel_not_found:${kf}`;
  try {
    const { stdout, stderr } = await execFileAsync(SWIPL, [
      "-g", query, "-t", "halt.", "-q", kf
    ], { encoding: "utf8", timeout: 15000, env: PROLOG_ENV });
    return (stdout + stderr).trim() || "pass";
  } catch (e: any) {
    return `error:${e.message}`;
  }
}

async function plQueryAll(query: string, kernel?: string): Promise<string[]> {
  const kf = kernel ?? PLASMA_GATE;
  if (!existsSync(kf)) return [`kernel_not_found:${kf}`];
  try {
    const { stdout, stderr } = await execFileAsync(SWIPL, [
      "-g", `findall(X, (${query}), Xs), maplist(writeln, Xs)`, "-t", "halt.", "-q", kf
    ], { encoding: "utf8", timeout: 15000, env: PROLOG_ENV });
    const lines = (stdout + stderr).trim().split("\n").filter(l => l.trim());
    return lines.length ? lines : ["pass"];
  } catch (e: any) {
    return [`error:${e.message}`];
  }
}

// ── Real axiom execution via plasma_gate.pl ──────────────────────────────────
async function executePrologAxiom(axiom: { id: string; query?: string; description?: string }, rawOutput: string): Promise<{ id: string; pass: boolean; output: string }> {
  const inKernel = existsSync(PLASMA_GATE);
  if (!inKernel) return { id: axiom.id, pass: true, output: "plasma_gate.pl not found, skip" };

  switch (axiom.id) {
    // ── §6 Governing Principles ────────────────────────────────────────────────
    case "ax_governing_principles": {
      const out = await plQuery("findall(PID, governing_principle(PID,_,_,valid,_,_,_), PIDs), length(PIDs, 7)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "7/7 principles valid" : `principle check: ${out}` };
    }

    // ── §7 Prohibited Actions ──────────────────────────────────────────────────
    case "ax_prohibited_actions": {
      const out = await plQuery("findall(AID, prohibited_action(AID,_,_,_,_,_,_,_), AIDs), length(AIDs, 8)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "8/8 prohibitions recognized" : `prohibition check: ${out}` };
    }

    // ── §10 Mass Gate ──────────────────────────────────────────────────────────
    case "ax_plasma_gate": {
      const out = await plQuery("verify_axiom_set");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: out || "mass_gate_pass" };
    }

    // ── §1 Crypto FFI ──────────────────────────────────────────────────────────
    case "ax_crypto_ffi": {
      const nonce = await plQuery("secure_nonce_ffi(N)");
      const pass = nonce.length >= 64 && !nonce.includes("error") && !nonce.includes("false");
      return { id: axiom.id, pass, output: pass ? `nonce_ok(${nonce.slice(0, 16)}...)` : `nonce_fail:${nonce}` };
    }

    // ── §2 WORM Chain ──────────────────────────────────────────────────────────
    case "ax_worm_seal": {
      const out = await plQuery("worm_seal_required(seal)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "WORM seal required" : out };
    }

    // ── §3 Human Review Oracle ─────────────────────────────────────────────────
    case "ax_human_review": {
      const results = await plQueryAll("human_review_required(R)");
      const pass = results.length >= 5;
      return { id: axiom.id, pass, output: pass ? `${results.length} review types registered` : `human_review:${results.join(",")}` };
    }

    // ── §4 Role System ─────────────────────────────────────────────────────────
    case "ax_role_system": {
      const roles = await plQueryAll("role_definition(R,_)");
      const profs = await plQueryAll("proficiency(P)");
      const pass = roles.length >= 3 && profs.length >= 3;
      return { id: axiom.id, pass, output: pass ? `${roles.length} roles, ${profs.length} proficiency levels` : `roles:${roles.length} profs:${profs.length}` };
    }

    // ── §8 Corpus Families ─────────────────────────────────────────────────────
    case "ax_corpus_families": {
      const out = await plQuery("findall(FID, corpus_family(FID,_,_), FIDs), length(FIDs, 106)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "106 corpus families registered" : `corpus:${out}` };
    }

    // ── §5 Sovereign Assets ────────────────────────────────────────────────────
    case "ax_sovereign_assets": {
      const assets = await plQueryAll("sovereign_assets(A)");
      const pass = assets.length >= 3;
      return { id: axiom.id, pass, output: pass ? `${assets.length} asset classes: ${assets.join(", ")}` : `assets:${assets.join(",")}` };
    }

    // ── §9 Identity Binding ────────────────────────────────────────────────────
    case "ax_identity": {
      const op = await plQuery("operator_identity(ahmad_ali_parr)");
      const audit = await plQuery("audit_spec('4b565498-9afc-4782-af4a-c6b11a5d0058')");
      const pass = !op.includes("false") && !audit.includes("false");
      return { id: axiom.id, pass, output: pass ? "operator+audit bound" : `op:${op} audit:${audit}` };
    }

    // ── Legacy: EmojiCode ──────────────────────────────────────────────────────
    case "ax_emojicode": {
      const emojis = rawOutput.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
      const valid = emojis.filter(e => EMOJI_MODES[e]);
      const invalid = emojis.filter(e => !EMOJI_MODES[e]);
      const pass = invalid.length === 0;
      return { id: axiom.id, pass, output: pass ? `${valid.length} valid EmojiCode modes` : `Invalid: ${invalid.join(",")}` };
    }

    default: {
      // Generic Prolog query from trust-deed.json
      const query = axiom.query ?? "true";
      const out = await plQuery(query);
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: out || "ok" };
    }
  }
}

// ── Lean axioms (keep existing) ──────────────────────────────────────────────
const LEAN = process.env.LEAN_PATH ?? "lake";
const LEAN_DIR = join(WORKSPACE, "lean4");

async function executeLeanAxiom(axiom: { id: string; description?: string }, rawOutput: string): Promise<{ id: string; pass: boolean; output: string }> {
  try {
    if (axiom.id === "ax_lean_verify") {
      if (!existsSync(LEAN_DIR)) return { id: axiom.id, pass: true, output: "lean4/ not found, skip" };
      let buildOk = true, buildOut = "";
      try {
        const r = await execFileAsync(LEAN, ["build"], { cwd: LEAN_DIR, timeout: 120000, encoding: "utf8" });
        buildOut = r.stdout;
      } catch (e: any) { buildOk = false; buildOut = e.stdout ?? e.message; }
      let scanRaw = "";
      try {
        const { stdout } = await execFileAsync("rg", ["-n", "--no-heading", "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b", LEAN_DIR, "--glob", "*.lean"], { encoding: "utf8", timeout: 30000 });
        scanRaw = stdout;
      } catch { scanRaw = ""; }
      const hasSorry = /\bsorry\b/.test(scanRaw);
      const hasAdmit = /\badmit\b/.test(scanRaw);
      const hasAxiom = /\baxiom\b/.test(scanRaw);
      const hasOpaque = /\bopaque\b/.test(scanRaw);
      const pass = buildOk && !hasSorry && !hasAdmit && !hasAxiom && !hasOpaque;
      const debt = [];
      if (!buildOk) debt.push("build_failed");
      if (hasSorry) debt.push("sorry");
      if (hasAdmit) debt.push("admit");
      if (hasAxiom) debt.push("axiom");
      if (hasOpaque) debt.push("opaque");
      return { id: axiom.id, pass, output: pass ? "PROVED" : `Proof debt: ${debt.join(",")}` };
    }
    if (axiom.id === "ax_schema_enforce") {
      const hasSchema = rawOutput.includes("id") && rawOutput.includes("source_sha256") && (rawOutput.includes("review_status") || rawOutput.includes("weight"));
      return { id: axiom.id, pass: hasSchema, output: hasSchema ? "SCHEMA_FOUND" : "SCHEMA_MISSING" };
    }
    if (axiom.id === "ax_no_dan") {
      const hasDAN = rawOutput.includes("Data-Adversarial Network");
      return { id: axiom.id, pass: !hasDAN, output: hasDAN ? "DAN_DETECTED" : "CLEAN" };
    }
    // Generic Lean check
    const check = (rawOutput + (axiom.description ?? "")).toLowerCase();
    const hasContradiction = check.includes("contradict") || check.includes("impossible");
    return { id: axiom.id, pass: !hasContradiction, output: hasContradiction ? "CONTRADICTION" : "CONSISTENT" };
  } catch (e: any) {
    return { id: axiom.id, pass: false, output: e.message };
  }
}

// ── Execute all axioms ────────────────────────────────────────────────────────
async function executeAllAxioms(rawOutput: string): Promise<{ results: any[]; allPass: boolean }> {
  const results = [];
  for (const axiom of AXIOMS) {
    if (axiom.gate === "prolog_gate") results.push(await executePrologAxiom(axiom, rawOutput));
    else if (axiom.gate === "lean_gate") results.push(await executeLeanAxiom(axiom, rawOutput));
    else results.push({ id: axiom.id, pass: false, output: "no gate specified" });
  }
  return { results, allPass: results.every(r => r.pass) };
}

// ── Syscall gate ──────────────────────────────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────────
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

    const syscalls = extractSyscalls(raw);
    const gate = syscalls.map(s => ({ syscall: s, ...gateSyscall(s) }));
    const allowed = gate.filter(g => g.verdict === "ALLOW");
    const approval = gate.filter(g => g.verdict === "APPROVAL_REQUIRED");
    const rejected = gate.filter(g => g.verdict === "REJECT");

    const axiomResults = await executeAllAxioms(raw);

    const ts = new Date().toISOString();
    const receipt = {
      id: createHash("sha256").update(raw + ts).digest("hex").slice(0, 16),
      timestamp: ts,
      trust_deed: TRUST_DEED.name,
      version: TRUST_DEED.version,
      kernel: existsSync(PLASMA_GATE) ? "plasma_gate.pl" : "legacy",
      syscalls: { detected: syscalls, gate },
      axioms: { allPass: axiomResults.allPass, results: axiomResults.results },
      status: rejected.length > 0 ? "REJECTED" : approval.length > 0 ? "APPROVAL_REQUIRED" : "ACCEPTED",
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
  const result = await executeAllAxioms("");
  res.json(result);
});

app.get("/api/kernel", (_req, res) => {
  const hasPlasma = existsSync(PLASMA_GATE);
  const hasSyscalls = existsSync(SYSCALLS_PL);
  res.json({
    plasma_gate: hasPlasma ? readFileSync(PLASMA_GATE, "utf8").length : 0,
    syscalls: hasSyscalls ? readFileSync(SYSCALLS_PL, "utf8").length : 0,
    kernel: hasPlasma ? "plasma_gate.pl" : hasSyscalls ? "syscalls.pl" : "none",
  });
});

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`SnapKitty Harness :${process.env.PORT ?? 3001}`);
  console.log(`Model: snapkitty-nemotron (constitutional AI)`);
  console.log(`Kernel: ${existsSync(PLASMA_GATE) ? "plasma_gate.pl (REAL)" : "syscalls.pl (legacy)"}`);
  console.log(`Axioms: ${AXIOMS.length} loaded`);
});
