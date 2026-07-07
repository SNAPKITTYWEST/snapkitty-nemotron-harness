export type LeanGateStatus = "CLEAN_SCAN" | "SPEC" | "WARNING";

export interface LeanFinding {
  kind: string;
  line: number;
  text: string;
}

export interface LeanStaticResult {
  status: LeanGateStatus;
  findings: LeanFinding[];
  theoremCount: number;
  proofDebtCount: number;
}

const MARKERS = [
  { kind: "sorry", regex: /\bsorry\b/ },
  { kind: "admit", regex: /\badmit\b/ },
  { kind: "axiom", regex: /\baxiom\b/ },
  { kind: "opaque", regex: /\bopaque\b/ },
  { kind: "theorem", regex: /\btheorem\b/ },
];

export function scanLeanSource(source: string): LeanStaticResult {
  const findings: LeanFinding[] = [];
  source.split(/\r?\n/).forEach((line, i) => {
    for (const m of MARKERS) {
      if (m.regex.test(line)) {
        findings.push({ kind: m.kind, line: i + 1, text: line.trim() });
      }
    }
  });
  const proofDebt = findings.filter((f) =>
    ["sorry", "admit", "axiom", "opaque"].includes(f.kind)
  ).length;
  const theorems = findings.filter((f) => f.kind === "theorem").length;
  return {
    status: proofDebt === 0 ? "CLEAN_SCAN" : "SPEC",
    findings,
    theoremCount: theorems,
    proofDebtCount: proofDebt,
  };
}
