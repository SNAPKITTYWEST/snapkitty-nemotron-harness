import { callOllama } from "./ollama.js";
import { extractSyscalls, validateSyscalls } from "./syscall.js";
import { sha256, writeReceipt, type HarnessReceipt } from "./receipt.js";
import { validateSyscallsViaProlog } from "./prolog.js";

export interface RunResult {
  output: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  receiptPath: string;
  receipt: HarnessReceipt;
}

export async function runHarness(userPrompt: string): Promise<RunResult> {
  const { readFileSync } = await import("fs");
  const system = readFileSync("prompts/system.snap.md", "utf8");
  const policy = readFileSync("prompts/syscall-policy.md", "utf8");

  const prompt = `${system}

${policy}

USER TASK:
${userPrompt}

Return:
- decision
- assumptions
- syscalls
- next_action
`;

  const output = await callOllama(prompt);
  const syscalls = extractSyscalls(output);

  const { valid: jsValid } = validateSyscalls(syscalls);

  let prologValid = true;
  if (syscalls.length > 0) {
    const result = await validateSyscallsViaProlog(syscalls);
    prologValid = result.valid;
  }

  const status =
    jsValid && prologValid && !syscalls.includes("reject_unsealed")
      ? "ACCEPTED"
      : "REJECTED";

  const receiptPath = writeReceipt({
    timestamp: new Date().toISOString(),
    model: process.env.OLLAMA_MODEL ?? "unknown",
    input_sha256: sha256(prompt),
    output_sha256: sha256(output),
    syscalls,
    status,
    prolog_validated: prologValid,
  });

  return { output, syscalls, status, receiptPath, receipt: JSON.parse(readFileSync(receiptPath, "utf8")) };
}

export { callOllama } from "./ollama.js";
export { extractSyscalls, validateSyscalls } from "./syscall.js";
export { sha256, writeReceipt, type HarnessReceipt } from "./receipt.js";
export { validateSyscallsViaProlog, runPrologQuery } from "./prolog.js";
