import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadTrustDeed } from "../src/trustDeed.js";
import { checkSyscall } from "../src/policyGate.js";
import { normalizeModelOutput } from "../src/normalize.js";
import { resolvePreferredModel } from "../src/ollama.js";

test("enabled syscall is allowed", () => {
  const deed = loadTrustDeed(fileURLToPath(new URL("../trust-deed.json", import.meta.url)));
  const decision = checkSyscall(deed, "lean_gate");
  assert.equal(decision.status, "ALLOW");
  assert.equal(decision.requiresReceipt, true);
});

test("disabled dangerous syscall requires approval", () => {
  const deed = loadTrustDeed(fileURLToPath(new URL("../trust-deed.json", import.meta.url)));
  const decision = checkSyscall(deed, "bash_exec");
  assert.equal(decision.status, "APPROVAL_REQUIRED");
});

test("normalizer extracts syscall tokens and uncertainty", () => {
  const normalized = normalizeModelOutput("<|lean_gate|>\nSPEC\n<|receipt_seal|>");
  assert.deepEqual(normalized.syscalls, ["lean_gate", "receipt_seal"]);
  assert.equal(normalized.uncertainty, "SPEC");
});

test("preferred model resolves to installed snapkitty variant", () => {
  const selected = resolvePreferredModel([
    { name: "nemotron-mini:latest", model: "nemotron-mini:latest" },
    { name: "snapkitty-nemotron:latest", model: "snapkitty-nemotron:latest" }
  ], undefined, "nemotron");
  assert.equal(selected, "snapkitty-nemotron:latest");
});
