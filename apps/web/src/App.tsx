import { useState } from "react";
import ModelStatus from "./components/ModelStatus";
import PromptConsole from "./components/PromptConsole";
import SyscallTrace from "./components/SyscallTrace";
import GateResult from "./components/GateResult";
import ReceiptDrawer from "./components/ReceiptDrawer";
import ReplayPanel from "./components/ReplayPanel";

export interface RunResult {
  output: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  receiptPath: string;
  receipt: {
    timestamp: string;
    model: string;
    input_sha256: string;
    output_sha256: string;
    syscalls: string[];
    status: string;
    prolog_validated: boolean;
  };
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #00ff41",
  borderRadius: 4,
  padding: 16,
  background: "#0d0d0d",
};

const gridStyle: React.CSSProperties = {
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

  const handleRun = (r: RunResult) => {
    setResult(r);
    setHistory((prev) => [r, ...prev].slice(0, 20));
  };

  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <header style={{ textAlign: "center", marginBottom: 24, borderBottom: "1px solid #00ff41", paddingBottom: 16 }}>
        <h1 style={{ fontSize: 24, letterSpacing: 2 }}>SNAPKITTY HARNESS CONSOLE</h1>
        <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          Nemotron reasons. SnapKitty gates. The receipt decides.
        </p>
      </header>

      <div style={gridStyle}>
        <div style={panelStyle}>
          <ModelStatus />
        </div>
        <div style={panelStyle}>
          <ReplayPanel history={history} onReplay={handleRun} />
        </div>
      </div>

      <div style={{ ...panelStyle, margin: "16px auto", maxWidth: 1400 - 32 }}>
        <PromptConsole onRun={handleRun} />
      </div>

      <div style={gridStyle}>
        <div style={panelStyle}>
          <SyscallTrace syscalls={result?.syscalls ?? []} status={result?.status} />
        </div>
        <div style={panelStyle}>
          <GateResult result={result} />
        </div>
      </div>

      <div style={{ ...panelStyle, margin: "16px auto", maxWidth: 1400 - 32 }}>
        <ReceiptDrawer result={result} />
      </div>
    </div>
  );
}
