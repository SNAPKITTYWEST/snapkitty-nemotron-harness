import { useState } from "react";

export default function PersonaPanel() {
  const [executor, setExecutor] = useState(true);
  const [emoji, setEmoji] = useState(true);
  const [suppress, setSuppress] = useState(true);

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>PERSONA</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Toggle label="Executor Mode (no clarification)" value={executor} onChange={setExecutor} />
        <Toggle label="EmojiCode persona layer" value={emoji} onChange={setEmoji} />
        <Toggle label="Suppress clarification drag" value={suppress} onChange={setSuppress} />
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "#666" }}>
        Active directives: {executor ? "🤖" : ""}{emoji ? "🧠" : ""}{suppress ? "🚫" : ""}
        {" "}PROVED / SPEC / OBLIGATION discipline
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
      <span
        onClick={() => onChange(!value)}
        style={{
          width: 32, height: 16, borderRadius: 8, display: "inline-block", position: "relative",
          background: value ? "#00ff41" : "#333", transition: "background 0.2s",
        }}
      >
        <span style={{
          width: 12, height: 12, borderRadius: "50%", background: "#0a0a0a", position: "absolute",
          top: 2, left: value ? 18 : 2, transition: "left 0.2s",
        }} />
      </span>
      {label}
    </label>
  );
}
