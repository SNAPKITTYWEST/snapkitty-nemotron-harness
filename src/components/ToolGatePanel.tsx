export interface ToolConfig {
  lean4: boolean;
  prolog: boolean;
  tavily: boolean;
  bash: boolean;
}

interface Props {
  tools: ToolConfig;
  onChange: (t: ToolConfig) => void;
}

const TOOLS: { key: keyof ToolConfig; label: string }[] = [
  { key: "lean4", label: "Lean 4" },
  { key: "prolog", label: "Prolog" },
  { key: "tavily", label: "Tavily" },
  { key: "bash", label: "bash" },
];

export default function ToolGatePanel({ tools, onChange }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>TOOL GATES</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange({ ...tools, [t.key]: !tools[t.key] })}
            style={{
              padding: "6px 14px", fontFamily: "monospace", fontSize: 11, cursor: "pointer",
              background: tools[t.key] ? "#00ff41" : "#1a1a1a",
              color: tools[t.key] ? "#0a0a0a" : "#666",
              border: `1px solid ${tools[t.key] ? "#00ff41" : "#333"}`,
            }}
          >
            {t.label}: {tools[t.key] ? "ON" : "OFF"}
          </button>
        ))}
      </div>
    </div>
  );
}
