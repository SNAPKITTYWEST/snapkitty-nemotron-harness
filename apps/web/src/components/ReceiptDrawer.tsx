import type { RunResult } from "../App";

interface Props {
  result: RunResult | null;
}

export default function ReceiptDrawer({ result }: Props) {
  if (!result) {
    return (
      <div>
        <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>RECEIPT</h2>
        <div style={{ color: "#666", fontSize: 12 }}>No receipt yet</div>
      </div>
    );
  }

  const { receipt } = result;
  const json = JSON.stringify(receipt, null, 2);

  const copyReceipt = () => navigator.clipboard.writeText(json);
  const downloadReceipt = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>RECEIPT</h2>
      <pre
        style={{
          background: "#0a0a0a",
          border: "1px solid #00ff41",
          padding: 12,
          fontSize: 11,
          overflow: "auto",
          maxHeight: 200,
          fontFamily: "monospace",
        }}
      >
        {json}
      </pre>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={copyReceipt} style={btnStyle}>Copy Receipt</button>
        <button onClick={downloadReceipt} style={btnStyle}>Download JSON</button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "#1a1a1a",
  color: "#00ff41",
  border: "1px solid #00ff41",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 11,
};
