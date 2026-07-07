import { useState, useCallback } from "react";
import ModelPanel from "./components/ModelPanel";
import PersonaPanel from "./components/PersonaPanel";
import ToolGatePanel, { type ToolConfig } from "./components/ToolGatePanel";
import PromptConsole from "./components/PromptConsole";
import PolicyGatePanel from "./components/PolicyGatePanel";
import LeanGatePanel from "./components/LeanGatePanel";
import SyscallTrace from "./components/SyscallTrace";
import ToolOutput from "./components/ToolOutput";
import ReceiptDrawer from "./components/ReceiptDrawer";
import ReplayPanel from "./components/ReplayPanel";
import type { HarnessReceipt } from "./lib/receipt";
import type { SyscallGateResult } from "./gates/prologGate";

export interface RunResult {
  output: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  receipt: HarnessReceipt;
  tools: any[];
}

const P: React.CSSProperties = { border: "1px solid #00ff41", borderRadius: 4, padding: 16, background: "#0d0d0d" };
const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);
  const [modelUrl, setModelUrl] = useState("http://127.0.0.1:11434");
  const [modelName, setModelName] = useState("llama3.1:8b");
  const [tools, setTools] = useState<ToolConfig>({ lean4: true, prolog: true, tavily: false, bash: false });
  const [policyResults, setPolicyResults] = useState<SyscallGateResult[]>([]);

  const onRun = useCallback((r: RunResult) => {
    setResult(r);
    setHistory((p) => [r, ...p].slice(0, 20));
  }, []);

  return (
    <div style={{ padding: 12, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 16, borderBottom: "1px solid #00ff41", paddingBottom: 12 }}>
        <h1 style={{ fontSize: 20, letterSpacing: 2 }}>SNAPKITTY HARNESS</h1>
        <p style={{ color: "#666", fontSize: 11 }}>Nemotron reasons. Prolog gates. Lean verifies. Receipt decides.</p>
      </header>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><ModelPanel url={modelUrl} model={modelName} onUrlChange={setModelUrl} onModelChange={setModelName} /></div>
        <div style={P}><PersonaPanel /></div>
      </div>

      <div style={{ ...P, marginBottom: 12 }}>
        <ToolGatePanel tools={tools} onChange={setTools} />
      </div>

      <div style={{ ...P, marginBottom: 12 }}>
        <PromptConsole modelName={modelName} tools={tools as any} onRun={onRun} onPolicyGate={setPolicyResults} />
      </div>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><PolicyGatePanel results={policyResults} /></div>
        <div style={P}><LeanGatePanel /></div>
      </div>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><SyscallTrace syscalls={result?.syscalls ?? []} status={result?.status} /></div>
        <div style={P}><ToolOutput tools={result?.tools ?? []} /></div>
      </div>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><ReceiptDrawer result={result} /></div>
        <div style={P}><ReplayPanel history={history} /></div>
      </div>
    </div>
  );
}
