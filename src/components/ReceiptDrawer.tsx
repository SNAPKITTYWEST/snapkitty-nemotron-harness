import type { RunResult } from "../App";
import { downloadReceipt, copyReceipt } from "../lib/receipt";

export default function ReceiptDrawer({ result }: { result: RunResult | null }) {
  if (!result) return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>RECEIPT</h2>
      <div style={{ color: "#666", fontSize: 12 }}>No receipt yet</div>
    </div>
  );

  const json = JSON.stringify(result.receipt, null, 2);
  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>RECEIPT</h2>
      <pre style={{ background: "#0a0a0a", border: "1px solid #00ff41", padding: 12,
        fontSize: 11, overflow: "auto", maxHeight: 200, fontFamily: "monospace" }}>{json}</pre>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => copyReceipt(result.receipt)} style={btn}>Copy Receipt</button>
        <button onClick={() => downloadReceipt(result.receipt)} style={btn}>Download JSON</button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "6px 12px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #00ff41", cursor: "pointer", fontFamily: "monospace", fontSize: 11,
};
