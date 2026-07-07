import type { RunResult } from "../App";
import { downloadJson, copyText } from "../lib/receipt";

export default function ReceiptDrawer({ result }: { result: RunResult | null }) {
  if (!result) return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>RECEIPT</h2>
      <div style={{ color: "#666", fontSize: 11 }}>No receipt yet</div>
    </div>
  );

  const r = result.receipt;
  const json = JSON.stringify(r, null, 2);

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>RECEIPT</h2>
      <div style={{ fontSize: 11, lineHeight: 1.8, marginBottom: 8 }}>
        <div>ID: <span style={{ color: "#ffb000" }}>{r.id}</span></div>
        <div>Status: <span style={{ color: r.status === "ACCEPTED" ? "#00ff41" : "#ff4141" }}>{r.status}</span></div>
        <div>Model: {r.model}</div>
        <div>Input hash: {r.input_sha256.slice(0, 16)}...</div>
        <div>Output hash: {r.output_sha256.slice(0, 16)}...</div>
        <div>Syscalls: {r.syscalls.length}</div>
        <div>Tools: {Object.keys(r.toolResults).join(", ") || "none"}</div>
      </div>
      <pre style={{
        background: "#0a0a0a", border: "1px solid #333", padding: 8,
        fontSize: 9, maxHeight: 120, overflow: "auto", fontFamily: "monospace",
      }}>{json.slice(0, 1000)}</pre>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => copyText(json)} style={btn}>Copy</button>
        <button onClick={() => downloadJson(r, `receipt-${r.id}.json`)} style={btn}>Download</button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "4px 10px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #333", cursor: "pointer", fontFamily: "monospace", fontSize: 10,
};
