import { useState } from "react";
import { callOllama, runLean, runBash, runSearch } from "../lib/api";
import { extractSyscalls } from "../lib/syscall";
import { validateSyscallsWasm } from "../gates/prologGate";
import { sha256, type HarnessReceipt } from "../lib/receipt";
import type { RunResult, ToolResult } from "../App";

const TEMPLATES = [
  { name: "📜 Lean Audit", prompt: "🤖📜 Scan the current project. Classify each Lean theorem as PROVED, SPEC, or OBLIGATION. Emit <|lean_gate|> for each check. Do not ask questions." },
  { name: "⚙️ Build Step", prompt: "🤖⚙️ Execute the smallest safe build step. Do not ask questions. Mark uncertainty as SPEC." },
  { name: "🧪 Code Review", prompt: "🤖🧪 Review this code for correctness. Emit <|lean_gate|> if formal verification is needed. Mark issues as SPEC." },
  { name: "🔍 Search + Gate", prompt: "🧠 Search for recent information about this topic. Emit <|tavily_search|>. Mark all results as RETRIEVAL_UNTRUSTED." },
  { name: "🧾 Full Pipeline", prompt: "🤖⚙️🧾 Run a full pipeline: search for context, classify theorems, build, seal receipt. Do not ask questions." },
];

import type { SyscallGateResult } from "../gates/prologGate";

interface Props {
  modelUrl: string; modelName: string;
  tools: Record<string, boolean>;
  onRun: (r: RunResult) => void;
  onPolicyGate?: (results: SyscallGateResult[]) => void;
}

export default function PromptConsole({ modelUrl, modelName, tools, onRun, onPolicyGate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((p) => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const run = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    setLog([]);
    const toolResults: ToolResult[] = [];

    try {
      // 1. Build system prompt
      addLog("Building persona prompt...");
      const persona = `You are Nemotron inside SnapKitty harness.\nRules: No clarification. Safest bounded assumption. Emit syscall tokens. Mark uncertainty as SPEC/OBLIGATION.`;
      const fullPrompt = `${persona}\n\nUSER TASK:\n${prompt}\n\nReturn:\n- decision\n- assumptions\n- syscalls\n- next_action`;

      // 2. Call Ollama
      addLog(`Calling ${modelName}...`);
      const { output } = await callOllama(fullPrompt, modelName);
      addLog(`Model returned ${output.length} chars`);

      // 3. Extract syscalls
      const syscalls = extractSyscalls(output);
      addLog(`Syscalls: ${syscalls.join(", ") || "none"}`);

      // 4. Execute tools based on syscalls
      if (syscalls.includes("lean_gate") && tools.lean4) {
        addLog("Running Lean 4 gate...");
        const leanResult = await runLean();
        toolResults.push({ name: "lean4", status: leanResult.status, output: leanResult });
        addLog(`Lean: ${leanResult.status}`);
      }

      if (tools.prolog) {
        addLog("Running Prolog gate (WASM)...");
        const prologResult = await validateSyscallsWasm(syscalls);
        toolResults.push({ name: "prolog", status: prologResult.valid ? "PASS" : "FAIL", output: prologResult });
        addLog(`Prolog: ${prologResult.valid ? "PASS" : "FAIL"}`);
        onPolicyGate?.(prologResult.details);
      }

      if (syscalls.includes("tavily_search") && tools.tavily) {
        addLog("Running Tavily search...");
        const searchResult = await runSearch(prompt, "tavily", true);
        toolResults.push({ name: "tavily", status: searchResult.status, output: searchResult });
        addLog(`Tavily: ${searchResult.status}`);
      }

      if (syscalls.includes("bash_exec") && tools.bash) {
        addLog("Bash requires approval...");
        toolResults.push({ name: "bash", status: "PENDING_APPROVAL", output: { command: "(from model)" } });
      }

      // 5. Build receipt
      addLog("Sealing receipt...");
      const inputHash = await sha256(fullPrompt);
      const outputHash = await sha256(output);
      const receipt: HarnessReceipt = {
        id: (await sha256(outputHash + Date.now())).slice(0, 16),
        timestamp: new Date().toISOString(),
        model: modelName,
        input_sha256: inputHash,
        output_sha256: outputHash,
        syscalls,
        toolResults: Object.fromEntries(toolResults.map((t) => [t.name, t])),
        status: syscalls.includes("reject_unsealed") ? "REJECTED" : "ACCEPTED",
      };

      addLog(`Receipt sealed: ${receipt.id}`);
      onRun({ output, syscalls, status: receipt.status, receipt, tools: toolResults });
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    }
    setRunning(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>PROMPT CONSOLE</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {TEMPLATES.map((t) => (
          <button key={t.name} onClick={() => setPrompt(t.prompt)} style={chip}>{t.name}</button>
        ))}
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="🤖⚙️ Enter task..." style={ta} />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button onClick={run} disabled={running} style={btn}>{running ? "Running..." : "Run + Seal"}</button>
        {log.length > 0 && (
          <div style={{ fontSize: 10, color: "#666", maxHeight: 40, overflow: "auto", flex: 1 }}>
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
const chip: React.CSSProperties = {
  padding: "4px 8px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #333", cursor: "pointer", fontFamily: "monospace", fontSize: 10,
};
const btn: React.CSSProperties = {
  padding: "8px 20px", background: "#00ff41", color: "#0a0a0a",
  border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", fontSize: 12,
};
