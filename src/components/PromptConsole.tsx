import { useState } from "react";
import { runHarness, type RunResult } from "../App";

const TEMPLATES = [
  { name: "Proof Status Audit", prompt: "Classify each theorem as PROVED, SPEC, or OBLIGATION. Do not ask questions." },
  { name: "Code Review", prompt: "Review this code for correctness and emit <|kernel_verify|> if verification is needed." },
  { name: "Executor Mode", prompt: "Execute the smallest safe build step. Do not ask questions. Mark uncertainty as SPEC." },
  { name: "Lean Theorem", prompt: "Review this Lean file. Classify each theorem. Mark uncertainty as SPEC." },
  { name: "Prolog Gate Test", prompt: "Emit <|executor_mode|> and <|kernel_verify|> and <|ere_check|>." },
];

interface Props { onRun: (r: RunResult) => void; }

export default function PromptConsole({ onRun }: Props) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    try {
      const url = localStorage.getItem("ollama_url") ?? "http://127.0.0.1:11434";
      const model = localStorage.getItem("ollama_model") ?? "nemotron";
      onRun(await runHarness(url, model, prompt));
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>PROMPT CONSOLE</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {TEMPLATES.map((t) => (
          <button key={t.name} onClick={() => setPrompt(t.prompt)} style={chip}>{t.name}</button>
        ))}
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your task prompt..." style={ta} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={run} disabled={running} style={btn}>{running ? "Running..." : "Run + Seal"}</button>
      </div>
    </div>
  );
}

const ta: React.CSSProperties = {
  width: "100%", height: 100, background: "#0a0a0a", color: "#00ff41",
  border: "1px solid #00ff41", padding: 12, fontFamily: "monospace", fontSize: 13, resize: "vertical",
};
const chip: React.CSSProperties = {
  padding: "4px 8px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #00ff41", cursor: "pointer", fontFamily: "monospace", fontSize: 11,
};
const btn: React.CSSProperties = {
  padding: "8px 24px", background: "#00ff41", color: "#0a0a0a",
  border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold",
};
