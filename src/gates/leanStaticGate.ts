export type LeanGateStatus = "CLEAN_SCAN" | "SPEC" | "WARNING";

export interface LeanStaticFinding {
  kind: "sorry" | "admit" | "axiom" | "opaque" | "theorem" | "def" | "import";
  line: number;
  text: string;
}

export interface LeanStaticGateResult {
  status: LeanGateStatus;
  findings: LeanStaticFinding[];
  theoremCount: number;
  proofDebtCount: number;
  boundary: string;
}

const patterns = [
  { kind: "sorry" as const, regex: /\bsorry\b/ },
  { kind: "admit" as const, regex: /\badmit\b/ },
  { kind: "axiom" as const, regex: /\baxiom\b/ },
  { kind: "opaque" as const, regex: /\bopaque\b/ },
  { kind: "theorem" as const, regex: /\btheorem\b/ },
  { kind: "def" as const, regex: /^\s*def\s+/ },
  { kind: "import" as const, regex: /^\s*import\s+/ },
];

export function runLeanStaticGate(source: string): LeanStaticGateResult {
  const findings: LeanStaticFinding[] = [];

  source.split(/\r?\n/).forEach((line, i) => {
    for (const p of patterns) {
      if (p.regex.test(line)) {
        findings.push({ kind: p.kind, line: i + 1, text: line.trim() });
      }
    }
  });

  const proofDebtCount = findings.filter((f) =>
    ["sorry", "admit", "axiom", "opaque"].includes(f.kind)
  ).length;

  const theoremCount = findings.filter((f) => f.kind === "theorem").length;

  return {
    status: proofDebtCount === 0 ? "CLEAN_SCAN" : "SPEC",
    findings,
    theoremCount,
    proofDebtCount,
    boundary:
      "Browser Static Gate does not run the Lean kernel. CLEAN_SCAN is not PROVED. Use Local Lean Gate for proof authority.",
  };
}
