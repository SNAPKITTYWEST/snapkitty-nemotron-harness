import { useState, useEffect } from "react";

export default function ModelStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [model, setModel] = useState("nemotron");
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/test-model");
      const data = await res.json();
      setOnline(data.online);
      setModel(data.model ?? "unknown");
    } catch {
      setOnline(false);
    }
    setTesting(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>MODEL CONNECTION</h2>
      <div style={{ fontSize: 12, lineHeight: 2 }}>
        <div>Model: {model}</div>
        <div>Ollama: {online === null ? "checking..." : online ? "online" : "offline"}</div>
        <div>Mode: executor</div>
        <div>Temperature: 0</div>
        <div>Seed: 42</div>
        <div>Receipt mode: enabled</div>
      </div>
      <button
        onClick={testConnection}
        disabled={testing}
        style={{
          marginTop: 12,
          padding: "6px 16px",
          background: "#00ff41",
          color: "#0a0a0a",
          border: "none",
          cursor: "pointer",
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      >
        {testing ? "Testing..." : "Test Model"}
      </button>
    </div>
  );
}
