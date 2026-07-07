import type { RunResult } from "../App";

interface Props {
  result: RunResult | null;
}

export default function ReceiptDrawer({ result }: Props) {
  if (!result) return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>RECEIPT</h2>
      <div style={{ fontSize: 11, color: "#666" }}>No receipt yet.</div>
    </div>
  );

  const r = result.receipt;
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>RECEIPT</h2>
      <div style={{ fontSize: 11 }}>
        <div>ID: <span style={{ color: "#00ff41" }}>{r.id}</span></div>
        <div>Time: {r.timestamp}</div>
        <div>Model: {r.model}</div>
        <div>Status: <span style={{ color: r.status === "ACCEPTED" ? "#00ff41" : "#ff4444" }}>{r.status}</span></div>
        <div>Input hash: <span style={{ color: "#999", fontSize: 10 }}>{r.input_sha256.slice(0, 16)}...</span></div>
        <div>Output hash: <span style={{ color: "#999", fontSize: 10 }}>{r.output_sha256.slice(0, 16)}...</span></div>
        <div>Syscalls: {r.syscalls.join(", ") || "none"}</div>
      </div>
    </div>
  );
}
