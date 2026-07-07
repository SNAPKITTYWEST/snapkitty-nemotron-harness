import { useState, useCallback } from "react";
import PersonaPanel from "./components/PersonaPanel";
import ModelPanel from "./components/ModelPanel";
import ToolGatePanel, { type ToolConfig } from "./components/ToolGatePanel";
import PromptConsole from "./components/PromptConsole";
import SyscallTrace from "./components/SyscallTrace";
import ToolOutput from "./components/ToolOutput";
import ReceiptDrawer from "./components/ReceiptDrawer";
import ReplayPanel from "./components/ReplayPanel";
import { callOllama } from "./lib/api";
import { extractSyscalls } from "./lib/syscall";
import { sha256, type HarnessReceipt } from "./lib/receipt";

export interface ToolResult {
  name: string;
  status: string;
  output: any;
}

export interface RunResult {
  output: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  receipt: HarnessReceipt;
  tools: ToolResult[];
}

const P: React.CSSProperties = {
  border: "1px solid #00ff41",
  borderRadius: 4,
  padding: 16,
  background: "#0d0d0d",
};

const G2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);
  const [modelUrl, setModelUrl] = useState(localStorage.getItem("ollama_url") ?? "http://127.0.0.1:11434");
  const [modelName, setModelName] = useState(localStorage.getItem("ollama_model") ?? "nemotron");
  const [tools, setTools] = useState<ToolConfig>({
    lean4: true, prolog: true, tavily: false, google: false, curl: false, bash: false,
  });

  const onRun = useCallback((r: RunResult) => {
    setResult(r);
    setHistory((p) => [r, ...p].slice(0, 20));
  }, []);

  return (
    <div style={{ padding: 12, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 16, borderBottom: "1px solid #00ff41", paddingBottom: 12 }}>
        <h1 style={{ fontSize: 20, letterSpacing: 2 }}>SNAPKITTY HARNESS CONSOLE</h1>
        <p style={{ color: "#666", fontSize: 11 }}>Nemotron reasons. EmojiCode sets posture. Lean verifies. Prolog gates. Tools execute by syscall. Receipt decides.</p>
      </header>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><ModelPanel url={modelUrl} model={modelName} onUrlChange={setModelUrl} onModelChange={setModelName} /></div>
        <div style={P}><PersonaPanel /></div>
      </div>

      <div style={{ ...P, marginBottom: 12 }}>
        <ToolGatePanel tools={tools} onChange={setTools} />
      </div>

      <div style={{ ...P, marginBottom: 12 }}>
        <PromptConsole
          modelUrl={modelUrl} modelName={modelName} tools={tools as unknown as Record<string, boolean>}
          onRun={onRun}
        />
      </div>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><SyscallTrace syscalls={result?.syscalls ?? []} status={result?.status} /></div>
        <div style={P}><ToolOutput tools={result?.tools ?? []} /></div>
      </div>

      <div style={{ ...G2, marginBottom: 12 }}>
        <div style={P}><ReceiptDrawer result={result} /></div>
        <div style={P}>        <ReplayPanel history={history} onReplay={onRun} modelUrl={modelUrl} modelName={modelName} tools={tools as unknown as Record<string, boolean>} /></div>
      </div>
    </div>
  );
}
