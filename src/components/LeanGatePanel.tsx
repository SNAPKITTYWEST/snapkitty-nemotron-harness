import { useState } from "react";
import { scanLeanSource, type LeanStaticResult } from "../gates/leanStaticGate";

export default function LeanGatePanel() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState<LeanStaticResult | null>(null);

  const scan = () => {
    if (!source.trim()) return;
    setResult(scanLeanSource(source));
  };

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>LEAN 4 GATE</h2>
      <div style={{ fontSize: 11, marginBottom: 8, color: "#999" }}>
        <div>Browser Static Gate: <span style={{ color: "#00ff41" }}>ACTIVE</span></div>
        <div>Local Lean Gate: <span style={{ color: "#666" }}>DISCONNECTED</span></div>
        <div>Kernel Proof Authority: <span style={{ color: "#666" }}>NOT IN BROWSER</span></div>
      </div>
      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Paste Lean 4 source..."
        style={{ width: "100%", height: 80, background: "#0a0a0a", color: "#00ff41", border: "1px solid #333", padding: 10, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
      />
      <button onClick={scan} style={{ marginTop: 8, padding: "6px 16px", background: "#00ff41", color: "#0a0a0a", border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", fontSize: 12 }}>
        Scan Source
      </button>
      {result && (
        <div style={{ marginTop: 10, borderTop: "1px solid #333", paddingTop: 8, fontSize: 11 }}>
          <div>Theorems: {result.theoremCount}</div>
          <div>Proof debt: <span style={{ color: "#ffb000" }}>{result.proofDebtCount}</span></div>
          <div style={{ fontWeight: "bold", color: result.status === "CLEAN_SCAN" ? "#00ff41" : "#ffb000" }}>Status: {result.status}</div>
          {result.findings.map((f, i) => (
            <div key={i} style={{ fontFamily: "monospace", color: ["sorry", "admit", "axiom", "opaque"].includes(f.kind) ? "#ffb000" : "#666", fontSize: 10, marginTop: 2 }}>
              line {f.line}: {f.kind}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
