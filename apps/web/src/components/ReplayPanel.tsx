import { useState } from "react";
import type { RunResult } from "../App";

interface Props {
  history: RunResult[];
  onReplay: (result: RunResult) => void;
}

export default function ReplayPanel({ history, onReplay }: Props) {
  const [replaying, setReplaying] = useState(false);

  const replay = async (result: RunResult) => {
    setReplaying(true);
    try {
      const prompt = `Replay this run:\n${JSON.stringify(result.receipt, null, 2)}`;
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seal: true }),
      });
      const data = await res.json();
      onReplay(data);
    } catch (err) {
      console.error(err);
    }
    setReplaying(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>REPLAY / DETERMINISM</h2>
      {history.length < 2 ? (
        <div style={{ color: "#666", fontSize: 12 }}>
          Run at least twice to compare hashes
        </div>
      ) : (
        <div style={{ fontSize: 12, lineHeight: 2 }}>
          <div>Run A hash: {history[0].receipt.output_sha256.slice(0, 16)}...</div>
          <div>Run B hash: {history[1].receipt.output_sha256.slice(0, 16)}...</div>
          <div
            style={{
              color:
                history[0].receipt.output_sha256 === history[1].receipt.output_sha256
                  ? "#00ff41"
                  : "#ffb000",
            }}
          >
            Match:{" "}
            {history[0].receipt.output_sha256 === history[1].receipt.output_sha256
              ? "YES"
              : "NO (controlled drift)"}
          </div>
        </div>
      )}
      {history.length > 0 && (
        <button
          onClick={() => replay(history[0])}
          disabled={replaying}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            background: "#1a1a1a",
            color: "#00ff41",
            border: "1px solid #00ff41",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          {replaying ? "Replaying..." : "Replay Same Prompt"}
        </button>
      )}
    </div>
  );
}
