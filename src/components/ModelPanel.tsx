interface Props {
  url: string;
  model: string;
  onUrlChange: (v: string) => void;
  onModelChange: (v: string) => void;
}

export default function ModelPanel({ url, model, onUrlChange, onModelChange }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>MODEL</h2>
      <label style={label}>Ollama URL</label>
      <input value={url} onChange={(e) => onUrlChange(e.target.value)} style={input} />
      <label style={label}>Model</label>
      <input value={model} onChange={(e) => onModelChange(e.target.value)} style={input} />
    </div>
  );
}

const label: React.CSSProperties = { display: "block", fontSize: 10, color: "#666", marginBottom: 2, marginTop: 8 };
const input: React.CSSProperties = {
  width: "100%", padding: "6px 8px", background: "#0a0a0a", color: "#00ff41",
  border: "1px solid #333", fontFamily: "monospace", fontSize: 12,
};
