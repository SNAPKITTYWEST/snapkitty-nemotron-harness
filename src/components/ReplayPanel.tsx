import type { RunResult } from "../App";

interface Props {
  history: RunResult[];
}

export default function ReplayPanel({ history }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>REPLAY</h2>
      {history.length === 0 && <div style={{ fontSize: 11, color: "#666" }}>No history.</div>}
      {history.map((r, i) => (
        <div key={i} style={{ fontSize: 11, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #222" }}>
          <div style={{ color: "#00ff41" }}>{r.receipt.id}</div>
          <div style={{ color: "#999", fontSize: 10 }}>{r.receipt.timestamp}</div>
          <div style={{ color: "#666", fontSize: 10 }}>{r.output.slice(0, 80)}...</div>
        </div>
      ))}
    </div>
  );
}
