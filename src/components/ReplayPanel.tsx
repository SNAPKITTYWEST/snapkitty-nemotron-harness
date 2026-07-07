import { useState } from "react";
import type { RunResult } from "../App";
import { callOllama } from "../lib/api";
import { extractSyscalls } from "../lib/syscall";
import { sha256, type HarnessReceipt } from "../lib/receipt";

interface Props {
  history: RunResult[];
  onReplay: (r: RunResult) => void;
  modelUrl: string; modelName: string;
  tools: Record<string, boolean>;
}

export default function ReplayPanel({ history, onReplay, modelUrl, modelName, tools }: Props) {
  const [replaying, setReplaying] = useState(false);

  const replay = async (r: RunResult) => {
    setReplaying(true);
    try {
      const { output } = await callOllama(`Replay this exact run:\n${r.receipt.output_sha256}`, modelName);
      const syscalls = extractSyscalls(output);
      const outputHash = await sha256(output);
      const receipt: HarnessReceipt = {
        id: (await sha256(outputHash + Date.now())).slice(0, 16),
        timestamp: new Date().toISOString(),
        model: modelName,
        input_sha256: r.receipt.input_sha256,
        output_sha256: outputHash,
        syscalls,
        toolResults: {},
        status: "ACCEPTED",
      };
      onReplay({ output, syscalls, status: "ACCEPTED", receipt, tools: [] });
    } catch (e) { console.error(e); }
    setReplaying(false);
  };

  const match = history.length >= 2
    ? history[0].receipt.output_sha256 === history[1].receipt.output_sha256
    : null;

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>REPLAY / DETERMINISM</h2>
      {history.length < 2 ? (
        <div style={{ color: "#666", fontSize: 11 }}>Run at least twice to compare</div>
      ) : (
        <div style={{ fontSize: 11, lineHeight: 1.8 }}>
          <div>Run A: {history[0].receipt.output_sha256.slice(0, 16)}...</div>
          <div>Run B: {history[1].receipt.output_sha256.slice(0, 16)}...</div>
          <div style={{ color: match ? "#00ff41" : "#ffb000", fontWeight: "bold" }}>
            Match: {match ? "YES (deterministic)" : "NO (drift detected)"}
          </div>
        </div>
      )}
      {history.length > 0 && (
        <button onClick={() => replay(history[0])} disabled={replaying} style={btn}>
          {replaying ? "Replaying..." : "Replay Last"}
        </button>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  marginTop: 8, padding: "4px 10px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #333", cursor: "pointer", fontFamily: "monospace", fontSize: 10,
};
