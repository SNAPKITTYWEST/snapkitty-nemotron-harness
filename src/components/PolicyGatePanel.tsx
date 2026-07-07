import type { SyscallGateResult } from "../gates/prologGate";

interface Props {
  results: SyscallGateResult[];
}

export default function PolicyGatePanel({ results }: Props) {
  const allowed = results.filter((r) => r.label === "ALLOWED").length;
  const approval = results.filter((r) => r.label === "APPROVAL").length;
  const rejected = results.filter((r) => r.label === "REJECTED").length;

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>POLICY GATE</h2>
      <div style={{ fontSize: 11, marginBottom: 8, color: "#999" }}>
        <div>Engine: <span style={{ color: "#00ff41" }}>Tau Prolog / WASM</span></div>
        <div>Mode: <span style={{ color: "#00ff41" }}>Browser</span></div>
        <div>Detected: {results.length} | Allowed: <span style={{ color: "#00ff41" }}>{allowed}</span> | Approval: <span style={{ color: "#ffb000" }}>{approval}</span> | Rejected: <span style={{ color: "#ff4444" }}>{rejected}</span></div>
      </div>
      {results.map((r) => (
        <div key={r.syscall} style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: "#00ff41" }}>{`<|${r.syscall}|>`}</span>
          <span style={{ color: r.label === "ALLOWED" ? "#00ff41" : r.label === "APPROVAL" ? "#ffb000" : "#ff4444" }}>
            {r.label}{r.receiptRequired ? "  receipt" : ""}
          </span>
        </div>
      ))}
      {results.length === 0 && <div style={{ fontSize: 11, color: "#666" }}>Run a prompt to see gate results.</div>}
    </div>
  );
}
