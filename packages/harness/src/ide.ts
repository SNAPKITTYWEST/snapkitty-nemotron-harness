export function parseStructuredOutput(text: string): {
  decision: string;
  assumptions: string[];
  syscalls: string[];
  next_action: string;
} {
  const lines = text.split("\n");
  let decision = "";
  const assumptions: string[] = [];
  const syscalls: string[] = [];
  let next_action = "";

  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^-?\s*decision:/i.test(trimmed)) {
      currentSection = "decision";
      decision = trimmed.replace(/^-*\s*decision:\s*/i, "").trim();
    } else if (/^-?\s*assumptions:/i.test(trimmed)) {
      currentSection = "assumptions";
    } else if (/^-?\s*syscalls:/i.test(trimmed)) {
      currentSection = "syscalls";
    } else if (/^-?\s*next.?action:/i.test(trimmed)) {
      currentSection = "next_action";
      next_action = trimmed.replace(/^-*\s*next.?action:\s*/i, "").trim();
    } else if (currentSection === "assumptions" && trimmed.startsWith("-")) {
      assumptions.push(trimmed.replace(/^-\s*/, "").trim());
    } else if (currentSection === "syscalls" && trimmed.startsWith("-")) {
      syscalls.push(trimmed.replace(/^-\s*/, "").trim());
    }
  }

  return { decision, assumptions, syscalls, next_action };
}
