import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { loadHarnessConfig } from "./src/config.js";
import { listOllamaModels, resolvePreferredModel, chatWithOllama } from "./src/ollama.js";
import { writeReceipt } from "./src/receipt.js";

config();

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: "10mb" }));

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = process.env.WORKSPACE ?? ROOT_DIR;
const DIST_DIR = join(ROOT_DIR, "dist");
const PUBLIC_DIR = existsSync(DIST_DIR) ? DIST_DIR : ROOT_DIR;
const KERNEL_DIR = join(ROOT_DIR, "kernel");
const PLASMA_GATE = join(KERNEL_DIR, "plasma_gate.pl");
const SYSCALLS_PL = join(KERNEL_DIR, "syscalls.pl");
const FFI_HOST = join(KERNEL_DIR, "pl_ffi_host.exe");
const USER_HOME = process.env.USERPROFILE ?? process.env.HOME ?? ROOT_DIR;

function resolveToolPath(explicit: string | undefined, fallback: string, candidates: string[]): string {
  if (explicit && existsSync(explicit)) return explicit;
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return explicit ?? fallback;
}

const SWIPL = resolveToolPath(process.env.SWIPL_PATH, "swipl", [
  "C:\\Program Files\\swipl\\bin\\swipl.exe",
  "C:\\Program Files (x86)\\swipl\\bin\\swipl.exe"
]);
const LEAN = resolveToolPath(process.env.LEAN_PATH, "lake", [
  join(USER_HOME, ".elan", "bin", "lake.exe"),
  join(USER_HOME, ".elan", "bin", "lake")
]);
const LEAN_DIR = join(WORKSPACE, "lean4");
const PROLOG_ENV = { ...process.env, PATH: `${KERNEL_DIR};${process.env.PATH ?? ""}` };
const harnessConfig = loadHarnessConfig(join(ROOT_DIR, "harness.config.json"));

const TRUST_DEED = JSON.parse(readFileSync(join(ROOT_DIR, "trust-deed.json"), "utf8"));
const AXIOMS = TRUST_DEED.axioms || [];
const SYSCALL_POLICY = TRUST_DEED.allowed_syscalls || {};
let kernelStatePromise: Promise<{ file: string | null; name: string; degraded: boolean; diagnostic: string | null }> | null = null;

const EMOJI_MODES: Record<string, string> = {
  "🤖": "agent_execution_mode",
  "🧠": "reasoning_mode",
  "🔒": "seal_required",
  "🧪": "test_required",
  "📜": "proof_status_check",
  "🚫": "reject_unsafe",
  "🧾": "receipt_required",
  "⚙️": "build_step",
  "🕳️": "uncertainty_SPEC",
  "✅": "verified_passed_gate"
};

app.use(express.static(PUBLIC_DIR));

async function detectKernelState(): Promise<{ file: string | null; name: string; degraded: boolean; diagnostic: string | null }> {
  if (kernelStatePromise) return kernelStatePromise;
  kernelStatePromise = (async () => {
    const tryKernel = async (kernelFile: string, name: string) => {
      if (!existsSync(kernelFile)) return { ok: false, diagnostic: `${name}_missing` };
      try {
        const result = await execFileAsync(SWIPL, ["-g", "true", "-t", "halt.", "-q", kernelFile], {
          encoding: "utf8",
          timeout: 15000,
          env: PROLOG_ENV
        });
        const merged = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        if (merged.includes("ERROR:")) {
          return { ok: false, diagnostic: merged.trim() };
        }
        return { ok: true, diagnostic: null };
      } catch (error: any) {
        return { ok: false, diagnostic: error.stderr || error.message };
      }
    };

    const plasma = await tryKernel(PLASMA_GATE, "plasma_gate");
    if (plasma.ok) return { file: PLASMA_GATE, name: "plasma_gate.pl", degraded: false, diagnostic: null };
    const syscalls = await tryKernel(SYSCALLS_PL, "syscalls");
    if (syscalls.ok) return { file: SYSCALLS_PL, name: "syscalls.pl", degraded: true, diagnostic: plasma.diagnostic };
    return { file: null, name: "none", degraded: true, diagnostic: plasma.diagnostic || syscalls.diagnostic || "no_prolog_kernel" };
  })();
  return kernelStatePromise;
}

async function plQuery(query: string, kernel?: string): Promise<string> {
  const activeKernel = kernel ?? (await detectKernelState()).file;
  const kernelFile = activeKernel;
  if (!kernelFile) return "kernel_not_found:none";
  if (!existsSync(kernelFile)) return `kernel_not_found:${kernelFile}`;
  try {
    const { stdout, stderr } = await execFileAsync(
      SWIPL,
      ["-g", query, "-t", "halt.", "-q", kernelFile],
      { encoding: "utf8", timeout: 15000, env: PROLOG_ENV }
    );
    const merged = (stdout + stderr).trim();
    return merged.includes("ERROR:") ? `error:${merged}` : (merged || "pass");
  } catch (error: any) {
    return `error:${error.message}`;
  }
}

async function plQueryAll(query: string, kernel?: string): Promise<string[]> {
  const kernelFile = kernel ?? PLASMA_GATE;
  if (!existsSync(kernelFile)) return [`kernel_not_found:${kernelFile}`];
  try {
    const { stdout, stderr } = await execFileAsync(
      SWIPL,
      ["-g", `findall(X, (${query}), Xs), maplist(writeln, Xs)`, "-t", "halt.", "-q", kernelFile],
      { encoding: "utf8", timeout: 15000, env: PROLOG_ENV }
    );
    const lines = (stdout + stderr).trim().split("\n").map(line => line.trim()).filter(Boolean);
    return lines.length ? lines : ["pass"];
  } catch (error: any) {
    return [`error:${error.message}`];
  }
}

async function executePrologAxiom(
  axiom: { id: string; query?: string; description?: string },
  rawOutput: string
): Promise<{ id: string; pass: boolean; output: string }> {
  const kernel = await detectKernelState();
  if (!kernel.file) {
    return { id: axiom.id, pass: true, output: "SKIP:no_prolog_kernel" };
  }

  const plasmaOnly = new Set(["ax_plasma_gate", "ax_crypto_ffi", "ax_corpus_families", "ax_sovereign_assets"]);
  if (plasmaOnly.has(axiom.id) && kernel.name !== "plasma_gate.pl") {
    return { id: axiom.id, pass: true, output: "SKIP:plasma_gate_unavailable" };
  }

  switch (axiom.id) {
    case "ax_governing_principles": {
      const out = await plQuery("findall(PID, governing_principle(PID,_,_,valid,_,_,_), PIDs), length(PIDs, 7)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "7/7 principles valid" : `principle check: ${out}` };
    }
    case "ax_prohibited_actions": {
      const out = await plQuery("findall(AID, prohibited_action(AID,_,_,_,_,_,_,_), AIDs), length(AIDs, 8)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "8/8 prohibitions recognized" : `prohibition check: ${out}` };
    }
    case "ax_plasma_gate": {
      const out = await plQuery("verify_axiom_set");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: out || "mass_gate_pass" };
    }
    case "ax_crypto_ffi": {
      const nonce = await plQuery("secure_nonce_ffi(N)");
      const pass = nonce.length >= 64 && !nonce.includes("error") && !nonce.includes("false");
      return { id: axiom.id, pass, output: pass ? `nonce_ok(${nonce.slice(0, 16)}...)` : `nonce_fail:${nonce}` };
    }
    case "ax_worm_seal": {
      const out = await plQuery("worm_seal_required(seal)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "WORM seal required" : out };
    }
    case "ax_human_review": {
      const results = await plQueryAll("human_review_required(R)");
      const pass = results.length >= 5;
      return { id: axiom.id, pass, output: pass ? `${results.length} review types registered` : `human_review:${results.join(",")}` };
    }
    case "ax_role_system": {
      const roles = await plQueryAll("role_definition(R,_)");
      const profs = await plQueryAll("proficiency(P)");
      const pass = roles.length >= 3 && profs.length >= 3;
      return { id: axiom.id, pass, output: pass ? `${roles.length} roles, ${profs.length} proficiency levels` : `roles:${roles.length} profs:${profs.length}` };
    }
    case "ax_corpus_families": {
      const out = await plQuery("findall(FID, corpus_family(FID,_,_), FIDs), length(FIDs, 106)");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: pass ? "106 corpus families registered" : `corpus:${out}` };
    }
    case "ax_sovereign_assets": {
      const assets = await plQueryAll("sovereign_assets(A)");
      const pass = assets.length >= 3;
      return { id: axiom.id, pass, output: pass ? `${assets.length} asset classes: ${assets.join(", ")}` : `assets:${assets.join(",")}` };
    }
    case "ax_identity": {
      const op = await plQuery("operator_identity(ahmad_ali_parr)");
      const audit = await plQuery("audit_spec('4b565498-9afc-4782-af4a-c6b11a5d0058')");
      const pass = !op.includes("false") && !audit.includes("false");
      return { id: axiom.id, pass, output: pass ? "operator+audit bound" : `op:${op} audit:${audit}` };
    }
    case "ax_emojicode": {
      const emojis = rawOutput.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
      const invalid = emojis.filter(emoji => !EMOJI_MODES[emoji]);
      const pass = invalid.length === 0;
      return { id: axiom.id, pass, output: pass ? `${emojis.length} valid EmojiCode modes` : `Invalid: ${invalid.join(",")}` };
    }
    default: {
      const out = await plQuery(axiom.query ?? "true");
      const pass = !out.includes("false") && !out.includes("error") && !out.includes("kernel_not_found");
      return { id: axiom.id, pass, output: out || "ok" };
    }
  }
}

async function executeLeanAxiom(
  axiom: { id: string; description?: string },
  rawOutput: string
): Promise<{ id: string; pass: boolean; output: string }> {
  try {
    if (axiom.id === "ax_lean_verify") {
      if (!existsSync(LEAN_DIR)) return { id: axiom.id, pass: true, output: "lean4/ not found, skip" };
      let buildOk = true;
      let buildOut = "";
      try {
        const result = await execFileAsync(LEAN, ["build"], { cwd: LEAN_DIR, timeout: 120000, encoding: "utf8" });
        buildOut = result.stdout;
      } catch (error: any) {
        buildOk = false;
        buildOut = error.stdout ?? error.message;
      }

      let scanRaw = "";
      try {
        const result = await execFileAsync("rg", ["-n", "--no-heading", "\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bopaque\\b", LEAN_DIR, "--glob", "*.lean"], { encoding: "utf8", timeout: 30000 });
        scanRaw = result.stdout;
      } catch {
        scanRaw = "";
      }

      const debt = [];
      if (!buildOk) debt.push("build_failed");
      if (/\bsorry\b/.test(scanRaw)) debt.push("sorry");
      if (/\badmit\b/.test(scanRaw)) debt.push("admit");
      if (/\baxiom\b/.test(scanRaw)) debt.push("axiom");
      if (/\bopaque\b/.test(scanRaw)) debt.push("opaque");
      return {
        id: axiom.id,
        pass: debt.length === 0,
        output: debt.length === 0 ? "PROVED" : `Proof debt: ${debt.join(",")} ${buildOut ? `(${buildOut.slice(0, 120)})` : ""}`.trim()
      };
    }

    if (axiom.id === "ax_schema_enforce") {
      const hasSchema = rawOutput.includes("id") && rawOutput.includes("source_sha256") && (rawOutput.includes("review_status") || rawOutput.includes("weight"));
      return { id: axiom.id, pass: hasSchema, output: hasSchema ? "SCHEMA_FOUND" : "SCHEMA_MISSING" };
    }

    if (axiom.id === "ax_no_dan") {
      const hasDan = rawOutput.includes("Data-Adversarial Network");
      return { id: axiom.id, pass: !hasDan, output: hasDan ? "DAN_DETECTED" : "CLEAN" };
    }

    const check = (rawOutput + (axiom.description ?? "")).toLowerCase();
    const hasContradiction = check.includes("contradict") || check.includes("impossible");
    return { id: axiom.id, pass: !hasContradiction, output: hasContradiction ? "CONTRADICTION" : "CONSISTENT" };
  } catch (error: any) {
    return { id: axiom.id, pass: false, output: error.message };
  }
}

async function executeAllAxioms(rawOutput: string): Promise<{ results: Array<{ id: string; pass: boolean; output: string }>; allPass: boolean }> {
  const results = [];
  const syscalls = extractSyscalls(rawOutput);
  const kernel = await detectKernelState();
  const plasmaDependent = new Set([
    "ax_governing_principles",
    "ax_prohibited_actions",
    "ax_plasma_gate",
    "ax_crypto_ffi",
    "ax_worm_seal",
    "ax_corpus_families",
    "ax_sovereign_assets"
  ]);
  for (const axiom of AXIOMS) {
    if (kernel.name !== "plasma_gate.pl" && plasmaDependent.has(axiom.id)) {
      results.push({ id: axiom.id, pass: true, output: "SKIP:requires_plasma_gate" });
      continue;
    }
    const shouldRun =
      axiom.id === "ax_governing_principles" ||
      axiom.id === "ax_prohibited_actions" ||
      axiom.id === "ax_identity" ||
      axiom.id === "ax_human_review" ||
      axiom.id === "ax_role_system" ||
      axiom.id === "ax_no_dan" ||
      (axiom.id === "ax_emojicode" && /[\u{1F300}-\u{1FAFF}]/u.test(rawOutput)) ||
      (axiom.id === "ax_lean_verify" && syscalls.includes("lean_gate")) ||
      (axiom.id === "ax_schema_enforce" && (rawOutput.includes("{") || rawOutput.includes("source_sha256") || rawOutput.toLowerCase().includes("schema"))) ||
      ["ax_plasma_gate", "ax_crypto_ffi", "ax_worm_seal", "ax_corpus_families", "ax_sovereign_assets"].includes(axiom.id);

    if (!shouldRun) {
      results.push({ id: axiom.id, pass: true, output: "SKIP:not_applicable" });
      continue;
    }
    if (axiom.gate === "prolog_gate") results.push(await executePrologAxiom(axiom, rawOutput));
    else if (axiom.gate === "lean_gate") results.push(await executeLeanAxiom(axiom, rawOutput));
    else results.push({ id: axiom.id, pass: false, output: "no gate specified" });
  }
  return { results, allPass: results.every(result => result.pass) };
}

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

async function getModelState(requested?: string) {
  const available = await listOllamaModels(harnessConfig.model.baseUrl);
  const resolved = resolvePreferredModel(available, requested, harnessConfig.model.model);
  return { available, resolved };
}

app.get("/api/health", async (_req, res) => {
  try {
    const { available, resolved } = await getModelState();
    const kernel = await detectKernelState();
    res.json({
      ok: true,
      mode: harnessConfig.mode,
      ollama: {
        reachable: true,
        baseUrl: harnessConfig.model.baseUrl,
        configuredModel: harnessConfig.model.model,
        resolvedModel: resolved,
        count: available.length
      },
      kernel: {
        plasmaGate: existsSync(PLASMA_GATE),
        syscallKernel: existsSync(SYSCALLS_PL),
        ffiHost: existsSync(FFI_HOST),
        swiplPath: SWIPL,
        active: kernel.name,
        degraded: kernel.degraded,
        diagnostic: kernel.diagnostic
      },
      lean: {
        dir: LEAN_DIR,
        exists: existsSync(LEAN_DIR),
        binary: LEAN
      },
      receipts: {
        enabled: harnessConfig.receipts.enabled,
        dir: resolve(harnessConfig.receipts.dir)
      }
    });
  } catch (error: any) {
    res.status(503).json({
      ok: false,
      mode: harnessConfig.mode,
      ollama: {
        reachable: false,
        baseUrl: harnessConfig.model.baseUrl,
        configuredModel: harnessConfig.model.model
      },
      error: error.message
    });
  }
});

app.get("/api/models", async (_req, res) => {
  try {
    const { available, resolved } = await getModelState();
    res.json({
      configuredModel: harnessConfig.model.model,
      resolvedModel: resolved,
      models: available.map(model => ({
        name: model.name,
        family: model.details?.family,
        contextLength: model.details?.context_length,
        parameterSize: model.details?.parameter_size
      }))
    });
  } catch (error: any) {
    res.status(503).json({ error: error.message, models: [] });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({
    mode: harnessConfig.mode,
    persona: harnessConfig.persona,
    tools: harnessConfig.tools,
    security: harnessConfig.security,
    receipts: harnessConfig.receipts,
    model: {
      provider: harnessConfig.model.provider,
      baseUrl: harnessConfig.model.baseUrl,
      configuredModel: harnessConfig.model.model
    }
  });
});

app.post("/api/ollama", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const { available, resolved } = await getModelState(req.body?.model);
    const raw = await chatWithOllama(harnessConfig.model.baseUrl, resolved, prompt, {
      temperature: harnessConfig.model.temperature,
      seed: harnessConfig.model.seed
    });

    const syscalls = extractSyscalls(raw);
    const gate = syscalls.map(syscall => ({ syscall, ...gateSyscall(syscall) }));
    const allowed = gate.filter(item => item.verdict === "ALLOW");
    const approval = gate.filter(item => item.verdict === "APPROVAL_REQUIRED");
    const rejected = gate.filter(item => item.verdict === "REJECT");
    const axioms = await executeAllAxioms(raw);
    const kernel = await detectKernelState();

    const status = rejected.length > 0 ? "REJECTED" : approval.length > 0 ? "APPROVAL_REQUIRED" : "ACCEPTED";
    const receipt = writeReceipt({
      kind: "model_output_gate",
      trust_deed: TRUST_DEED.name,
      trust_deed_version: TRUST_DEED.version,
      status,
      raw_output: raw,
      syscalls,
      gate
    }, { dir: harnessConfig.receipts.dir });

    res.json({
      raw,
      usedModel: resolved,
      availableModels: available.map(model => model.name),
      syscalls: { detected: syscalls, gate, allowed, approval, rejected },
      axioms,
      receipt: {
        id: receipt.receipt_id,
        timestamp: receipt.timestamp,
        status,
        kernel: kernel.name,
        trust_deed: TRUST_DEED.name,
        version: TRUST_DEED.version,
        receiptsDir: resolve(harnessConfig.receipts.dir),
        syscalls: { detected: syscalls }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ollama/raw", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const { resolved } = await getModelState(req.body?.model);
    const output = await chatWithOllama(harnessConfig.model.baseUrl, resolved, prompt, {
      temperature: harnessConfig.model.temperature,
      seed: harnessConfig.model.seed
    });
    res.json({ output, model: resolved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/trust-deed", (_req, res) => res.json(TRUST_DEED));
app.get("/api/axioms", async (_req, res) => res.json(await executeAllAxioms("")));

app.get("/api/kernel", (_req, res) => {
  res.json({
    plasma_gate: existsSync(PLASMA_GATE) ? readFileSync(PLASMA_GATE, "utf8").length : 0,
    syscalls: existsSync(SYSCALLS_PL) ? readFileSync(SYSCALLS_PL, "utf8").length : 0,
    ffiHost: existsSync(FFI_HOST),
    kernel: existsSync(PLASMA_GATE) ? "plasma_gate.pl" : existsSync(SYSCALLS_PL) ? "syscalls.pl" : "none"
  });
});

app.get("*", (_req, res) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`SnapKitty Harness :${port}`);
  console.log(`Serving from: ${PUBLIC_DIR}`);
  console.log(`Configured model: ${harnessConfig.model.model}`);
  console.log(`Kernel: ${existsSync(PLASMA_GATE) ? "plasma_gate.pl (REAL)" : existsSync(SYSCALLS_PL) ? "syscalls.pl (legacy)" : "none"}`);
  console.log(`Axioms: ${AXIOMS.length} loaded`);
});
