import { useState } from "react";

const TEMPLATES = [
  { name: "Proof Status Audit", prompt: "Classify each theorem as PROVED, SPEC, or OBLIGATION. Do not ask questions." },
  { name: "Code Review", prompt: "Review this code for correctness and emit <|kernel_verify|> if verification is needed." },
  { name: "Executor Mode Build Step", prompt: "Execute the smallest safe build step. Do not ask questions. Mark uncertainty as SPEC." },
  { name: "Lean Theorem Classifier", prompt: "Review this Lean file. Classify each theorem. Mark uncertainty as SPEC." },
  { name: "Prolog Gate Test", prompt: "Emit <|executor_mode|> and <|kernel_verify|> and <|ere_check|>." },
];

interface Props {
  onRun: (result: any) => void;
}

export default function PromptConsole({ onRun }: Props) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);

  const run = async (seal: boolean) => {
    if (!prompt.trim()) return;
    setRunning(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seal }),
      });
      const data = await res.json();
      onRun(data);
    } catch (err) {
      console.error(err);
    }
    setRunning(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>PROMPT CONSOLE</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => setPrompt(t.prompt)}
            style={{
              padding: "4px 8px",
              background: "#1a1a1a",
              color: "#00ff41",
              border: "1px solid #00ff41",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your task prompt..."
        style={{
          width: "100%",
          height: 120,
          background: "#0a0a0a",
          color: "#00ff41",
          border: "1px solid #00ff41",
          padding: 12,
          fontFamily: "monospace",
          fontSize: 13,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => run(false)}
          disabled={running}
          style={{
            padding: "8px 24px",
            background: "#00ff41",
            color: "#0a0a0a",
            border: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        >
          {running ? "Running..." : "Run"}
        </button>
        <button
          onClick={() => run(true)}
          disabled={running}
          style={{
            padding: "8px 24px",
            background: "#ffb000",
            color: "#0a0a0a",
            border: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        >
          Run + Seal
        </button>
      </div>
    </div>
  );
}
