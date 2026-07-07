import { useState, useCallback } from "react";
import ModelStatus from "./components/ModelStatus";
import PromptConsole from "./components/PromptConsole";
import SyscallTrace from "./components/SyscallTrace";
import GateResult from "./components/GateResult";
import ReceiptDrawer from "./components/ReceiptDrawer";
import ReplayPanel from "./components/ReplayPanel";
import { callOllama } from "./lib/ollama";
import { extractSyscalls, validateSyscalls } from "./lib/syscall";
import { validateSyscallsProlog } from "./lib/prolog";
import { sha256, type HarnessReceipt } from "./lib/receipt";

export interface RunResult {
  output: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  receipt: HarnessReceipt;
}

const panel: React.CSSProperties = {
  border: "1px solid #00ff41",
  borderRadius: 4,
  padding: 16,
  background: "#0d0d0d",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  padding: 16,
  maxWidth: 1400,
  margin: "0 auto",
};

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);

  const handleRun = useCallback(
    (r: RunResult) => {
      setResult(r);
      setHistory((p) => [r, ...p].slice(0, 20));
    },
    []
  );

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <header
        style={{
          textAlign: "center",
          marginBottom: 24,
          borderBottom: "1px solid #00ff41",
          paddingBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, letterSpacing: 2 }}>
          SNAPKITTY HARNESS CONSOLE
        </h1>
        <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          Nemotron reasons. SnapKitty gates. The receipt decides.
        </p>
      </header>

      <div style={grid}>
        <div style={panel}>
          <ModelStatus />
        </div>
        <div style={panel}>
          <ReplayPanel history={history} onReplay={handleRun} />
        </div>
      </div>

      <div style={{ ...panel, margin: "16px auto", maxWidth: 1400 - 32 }}>
        <PromptConsole onRun={handleRun} />
      </div>

      <div style={grid}>
        <div style={panel}>
          <SyscallTrace syscalls={result?.syscalls ?? []} status={result?.status} />
        </div>
        <div style={panel}>
          <GateResult result={result} />
        </div>
      </div>

      <div style={{ ...panel, margin: "16px auto", maxWidth: 1400 - 32 }}>
        <ReceiptDrawer result={result} />
      </div>
    </div>
  );
}

export async function runHarness(
  baseUrl: string,
  model: string,
  userPrompt: string
): Promise<RunResult> {
  const system = `You are Nemotron inside the SnapKitty deterministic harness.
You are not the authority. You are a compute resource inside a governed execution loop.
Rules:
1. Do not ask clarification questions unless execution is impossible.
2. Make the safest bounded assumption.
3. Emit syscall tokens when crossing authority boundaries.
4. Mark uncertainty as SPEC, TODO, or OBLIGATION.
5. Never claim proof unless the checker or compiler verifies it.
6. Return structured output with: decision, assumptions, syscalls, next_action.
Allowed syscall tokens:
<|kernel_verify|>
<|ere_check|>
<|worm_seal_required|>
<|build_receipt|>
<|reject_unsealed|>
<|executor_mode|>`;

  const prompt = `${system}\n\nUSER TASK:\n${userPrompt}\n\nReturn:\n- decision\n- assumptions\n- syscalls\n- next_action`;

  const output = await callOllama(baseUrl, model, prompt);
  const syscalls = extractSyscalls(output);
  const { valid: jsValid } = validateSyscalls(syscalls);
  const prolog = validateSyscallsProlog(syscalls);
  const status =
    jsValid && prolog.valid && !syscalls.includes("reject_unsealed")
      ? "ACCEPTED"
      : "REJECTED";

  const inputHash = await sha256(prompt);
  const outputHash = await sha256(output);

  const receipt: HarnessReceipt = {
    timestamp: new Date().toISOString(),
    model,
    input_sha256: inputHash,
    output_sha256: outputHash,
    syscalls,
    status,
    prolog_validated: prolog.valid,
  };

  return { output, syscalls, status, receipt };
}
