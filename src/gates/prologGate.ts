import pl from "tau-prolog";
import KERNEL_SRC from "../../kernel/syscalls.pl?raw";
import ERE_SRC from "../../kernel/ere_gate.pl?raw";

let session: pl.type.Session | null = null;
let ready: Promise<pl.type.Session> | null = null;

function getSession(): Promise<pl.type.Session> {
  if (session) return Promise.resolve(session);
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const s = pl.create();
    s.consult(KERNEL_SRC, () => {
      s.consult(ERE_SRC, () => {
        session = s;
        resolve(s);
      });
    });
  });
  return ready;
}

export function resetProlog() {
  session = null;
  ready = null;
}

export async function queryProlog(
  query: string
): Promise<{ success: boolean; answer: string; raw: string }> {
  try {
    const s = await getSession();
    return new Promise((resolve) => {
      s.query(query);
      s.answer((ans: any) => {
        const str = pl.format_answer(ans);
        const isTrue = str === "true" || str.includes("true");
        const isError = str.includes("error") || str.includes("exception");
        resolve({ success: isTrue && !isError, answer: str, raw: str });
      });
    });
  } catch (e: any) {
    return { success: false, answer: e.message, raw: "" };
  }
}

export interface SyscallGateResult {
  syscall: string;
  allowed: boolean;
  requiresApproval: boolean;
  receiptRequired: boolean;
  label: "ALLOWED" | "APPROVAL" | "REJECTED";
}

export async function validateSyscallsWasm(
  syscalls: string[]
): Promise<{ valid: boolean; output: string; details: SyscallGateResult[] }> {
  if (syscalls.length === 0) {
    return { valid: true, output: "no syscalls", details: [] };
  }

  const details: SyscallGateResult[] = [];

  for (const sc of syscalls) {
    const allowed = await queryProlog(`valid_syscall('${sc}')`);
    const approval = await queryProlog(`requires_approval('${sc}')`);
    const receipt = await queryProlog(`requires_receipt('${sc}')`);

    details.push({
      syscall: sc,
      allowed: allowed.success,
      requiresApproval: approval.success,
      receiptRequired: receipt.success,
      label: !allowed.success ? "REJECTED" : approval.success ? "APPROVAL" : "ALLOWED",
    });
  }

  const allAllowed = details.every((d) => d.allowed);
  const validSyscalls = details.filter((d) => d.allowed).map((d) => d.syscall);
  const list = validSyscalls.map((s) => `'${s}'`).join(",");
  const execResult = list
    ? await queryProlog(`valid_execution([${list}])`)
    : { success: true, answer: "no syscalls" };

  return {
    valid: allAllowed && execResult.success,
    output: execResult.answer,
    details,
  };
}

export async function runEreGateWasm(
  input: string
): Promise<{ pass: boolean; results: string[] }> {
  const r = await queryProlog(`ere5_check(${input}, Results)`);
  return { pass: r.success, results: [r.answer] };
}
