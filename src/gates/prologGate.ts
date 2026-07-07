import pl from "tau-prolog";
import KERNEL_SRC from "../../kernel/syscalls.pl?raw";
import ERE_SRC from "../../kernel/ere_gate.pl?raw";

let session: any = null;
let ready: Promise<any> | null = null;

function getSession(): Promise<any> {
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

export interface SyscallGateResult {
  syscall: string;
  allowed: boolean;
  requiresApproval: boolean;
  receiptRequired: boolean;
  label: "ALLOWED" | "APPROVAL" | "REJECTED";
}

async function queryProlog(q: string): Promise<boolean> {
  const s = await getSession();
  return new Promise((resolve) => {
    s.query(q);
    s.answer((ans: any) => {
      const str = pl.format_answer(ans);
      resolve(str === "true" || (str.includes("true") && !str.includes("error")));
    });
  });
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
      allowed,
      requiresApproval: approval,
      receiptRequired: receipt,
      label: !allowed ? "REJECTED" : approval ? "APPROVAL" : "ALLOWED",
    });
  }

  return {
    valid: details.every((d) => d.allowed),
    output: "evaluated",
    details,
  };
}
