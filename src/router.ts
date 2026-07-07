import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const SWIPL = process.env.SWIPL_PATH ?? "swipl";
const LEAN = process.env.LEAN_PATH ?? "lake";

const BASH_DENY = [/rm\s+-rf/, /sudo/, /chmod/, /chown/, /passwd/, /curl/, /wget/, /ssh/, /scp/];

export async function routeSyscall(
  syscall: string,
  params: Record<string, unknown>
): Promise<{ status: string; result?: unknown; error?: string }> {
  try {
    switch (syscall) {
      case "lean_gate":
        return await routeLean(params);
      case "prolog_gate":
        return await routeProlog(params);
      case "tavily_search":
      case "google_search":
        return await routeSearch(params);
      case "bash_exec":
        return await routeBash(params);
      case "curl_fetch":
        return await routeCurl(params);
      default:
        return { status: "NO_ROUTE", error: `No route for syscall: ${syscall}` };
    }
  } catch (e: any) {
    return { status: "ERROR", error: e.message };
  }
}

async function routeLean(params: Record<string, unknown>): Promise<{ status: string; result?: unknown }> {
  const target = (params.path as string) ?? join(process.cwd(), "lean4");
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
  return { status: "EXECUTED", result: { status, build: { ok: buildOk, stdout: buildOut.slice(0, 4000), stderr: buildErr.slice(0, 4000) }, scan: { sorry: hasSorry, admit: hasAdmit, axiom: hasAxiom, opaque: hasOpaque } } };
}

async function routeProlog(params: Record<string, unknown>): Promise<{ status: string; result?: unknown }> {
  const q = (params.query as string) ?? "true";
  const kernelFile = (params.file as string) ?? join(import.meta.dirname ?? ".", "kernel", "syscalls.pl");
  try {
    const { stdout, stderr } = await execFileAsync(SWIPL, ["-g", q, "-t", "halt.", kernelFile], { encoding: "utf8", timeout: 15_000 });
    const output = stdout.trim() || stderr.trim();
    return { status: "EXECUTED", result: { success: !output.includes("error"), output, kernel: "syscalls.pl" } };
  } catch (e: any) {
    return { status: "ERROR", result: { success: false, output: e.message } };
  }
}

async function routeSearch(params: Record<string, unknown>): Promise<{ status: string; result?: unknown }> {
  const query = params.query as string;
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { status: "NO_KEY" };
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    });
    const data = await r.json() as { results?: unknown[] };
    return { status: "EXECUTED", result: { status: "FOUND", query, results: data.results ?? [] } };
  } catch (e: any) {
    return { status: "ERROR", error: e.message };
  }
}

async function routeBash(params: Record<string, unknown>): Promise<{ status: string; result?: unknown }> {
  const command = params.command as string;
  if (!command) return { status: "ERROR", error: "command required" };
  if (BASH_DENY.some((rx) => rx.test(command))) return { status: "REJECTED", error: "denied pattern" };
  try {
    const { stdout, stderr } = await execFileAsync("bash", ["-c", command], { timeout: 30_000, encoding: "utf8", maxBuffer: 1024 * 1024 });
    return { status: "EXECUTED", result: { status: "EXECUTED", command, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000) } };
  } catch (e: any) {
    return { status: "ERROR", result: { status: "ERROR", command, error: e.message } };
  }
}

async function routeCurl(params: Record<string, unknown>): Promise<{ status: string; result?: unknown }> {
  const url = params.url as string;
  if (!url) return { status: "ERROR", error: "url required" };
  try {
    const { stdout } = await execFileAsync("curl", ["-sL", "--max-time", "15", url], { timeout: 20_000, encoding: "utf8", maxBuffer: 1024 * 1024 });
    return { status: "EXECUTED", result: { status: "FETCHED", url, body: stdout.slice(0, 8000) } };
  } catch (e: any) {
    return { status: "ERROR", result: { status: "ERROR", url, error: e.message } };
  }
}
