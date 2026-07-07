import type { RunResult } from "../App";

export default function ReplayPanel({ history, onReplay }: { history: RunResult[]; onReplay: (r: RunResult) => void }) {
  if (history.length < 2) return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>REPLAY / DETERMINISM</h2>
      <div style={{ color: "#666", fontSize: 12 }}>Run at least twice to compare hashes</div>
    </div>
  );

  const match = history[0].receipt.output_sha256 === history[1].receipt.output_sha256;
  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>REPLAY / DETERMINISM</h2>
      <div style={{ fontSize: 12, lineHeight: 2 }}>
        <div>Run A hash: {history[0].receipt.output_sha256.slice(0, 16)}...</div>
        <div>Run B hash: {history[1].receipt.output_sha256.slice(0, 16)}...</div>
        <div style={{ color: match ? "#00ff41" : "#ffb000" }}>
          Match: {match ? "YES" : "NO (controlled drift)"}
        </div>
      </div>
      <button onClick={() => onReplay(history[0])} style={btn}>Replay Same Prompt</button>
    </div>
  );
}

const btn: React.CSSProperties = {
  marginTop: 12, padding: "6px 12px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #00ff41", cursor: "pointer", fontFamily: "monospace", fontSize: 11,
};
