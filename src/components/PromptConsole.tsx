import { useState } from "react";
import { callOllama } from "../lib/api";
import { extractSyscalls } from "../lib/syscall";
import { validateSyscallsWasm, type SyscallGateResult } from "../gates/prologGate";
import { sha256, type HarnessReceipt } from "../lib/receipt";
import type { RunResult } from "../App";

interface Props {
  modelName: string;
  tools: Record<string, boolean>;
  onRun: (r: RunResult) => void;
  onPolicyGate: (r: SyscallGateResult[]) => void;
}

export default function PromptConsole({ modelName, tools, onRun, onPolicyGate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (m: string) => setLog((p) => [...p, `[${new Date().toLocaleTimeString()}] ${m}`]);

  const run = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    setLog([]);
    try {
      addLog(`Calling ${modelName}...`);
      const { output } = await callOllama(prompt, modelName);
      addLog(`Got ${output.length} chars`);

      const syscalls = extractSyscalls(output);
      addLog(`Syscalls: ${syscalls.join(", ") || "none"}`);

      addLog("Running Prolog gate (WASM)...");
      const gate = await validateSyscallsWasm(syscalls);
      onPolicyGate(gate.details);
      addLog(`Gate: ${gate.valid ? "PASS" : "FAIL"}`);

      addLog("Sealing receipt...");
      const inputHash = await sha256(prompt);
      const outputHash = await sha256(output);
      const receipt: HarnessReceipt = {
        id: (await sha256(outputHash + Date.now())).slice(0, 16),
        timestamp: new Date().toISOString(),
        model: modelName,
        input_sha256: inputHash,
        output_sha256: outputHash,
        syscalls,
        toolResults: {},
        status: "ACCEPTED",
      };
      addLog(`Receipt: ${receipt.id}`);
      onRun({ output, syscalls, status: "ACCEPTED", receipt, tools: [] });
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    }
    setRunning(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>PROMPT</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter task..."
        style={ta}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button onClick={run} disabled={running} style={btn}>
          {running ? "Running..." : "Run + Seal"}
        </button>
        {log.length > 0 && (
          <div style={{ fontSize: 10, color: "#666", flex: 1, maxHeight: 40, overflow: "auto" }}>
            {log.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

const ta: React.CSSProperties = {
  width: "100%", height: 80, background: "#0a0a0a", color: "#00ff41",
  border: "1px solid #333", padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical",
};
const btn: React.CSSProperties = {
  padding: "8px 20px", background: "#00ff41", color: "#0a0a0a",
  border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", fontSize: 12,
};
