# SnapKitty Nemotron Harness

A deterministic local harness for running Nemotron/Ollama as a governed agent with EmojiCode persona control, syscall-style tool gates, Lean 4 proof checks, Prolog policy validation, controlled retrieval, sandboxed shell execution, and sealed receipts.

This is not a chatbot wrapper.

Nemotron reasons. EmojiCode sets posture. Tau Prolog gates the browser. SWI-Prolog gates the machine. Lean verifies proof status. Tools execute only by syscall. The receipt decides.

## Why Prolog Is Inside the Harness

The model is not trusted to enforce its own rules.

Early harness experiments showed that model-only policy enforcement could hallucinate status, confuse proof categories, or ask clarification questions instead of executing bounded steps.

The Prolog gate exists to remove policy authority from the LLM.

The LLM emits intent. The Prolog gate validates authority. The receipt records the outcome.

## What This Is

This harness treats the LLM as an untrusted compute resource. Authority is handled by:

- EmojiCode persona/control layer
- Co-string syscall tokens
- Lean 4 theorem gates
- Prolog policy gates
- Controlled search retrieval
- Sandboxed shell execution
- SHA-256/BLAKE3 receipts
- Deterministic replay

## Why It Exists

Most AI tools return text and lose the reasoning trail.

This harness creates a local workflow where every important agent action can be classified, checked, and sealed.

The pattern is:

```
persona → EmojiCode/costring control → search tools → curl/bash execution
→ Lean 4 gates → Prolog gates → WORM receipts → deterministic replay
```

## Full Stack Architecture

### Browser / GitHub Pages Mode

```
User Prompt
  ↓
EmojiCode Persona Layer
  ↓
Nemotron-compatible prompt shell
  ↓
Co-string syscall extraction
  ↓
Tau Prolog / WASM FFI policy gate
  ↓
Lean 4 browser static gate (scan only)
  ↓
Receipt simulation / hash preview
  ↓
Replay panel
```

### Local Harness Mode

```
User Prompt
  ↓
Nemotron / Ollama
  ↓
Co-string syscall extraction
  ↓
SWI-Prolog policy gate
  ↓
Lean 4 build gate (lake build)
  ↓
Controlled curl / bash / search
  ↓
SHA-256/BLAKE3 receipt
  ↓
Replay + audit bundle
```

## Prolog Gate Modes

The harness supports two Prolog policy-gate modes.

### Browser Gate: Tau Prolog / WASM FFI

The browser gate runs policy checks inside the frontend. This allows the GitHub Pages demo to validate syscall tokens, persona state, and basic execution policy without a server.

Use cases:

- syscall allow/deny checks
- EmojiCode persona validation
- executor-mode enforcement
- clarification-drag suppression
- retrieval quarantine labels
- receipt-required decisions

### Local Gate: SWI-Prolog / Native Runtime

The local gate is used for stronger desktop workflows. It may call local files, build tools, Lean scans, shell commands, and receipt writers.

Use cases:

- `lake build`
- `sorry/admit/axiom/opaque` scanning
- local receipt sealing
- workspace file checks
- build/test command approval
- stronger ERE-5 policy validation

The browser gate demonstrates the law. The local gate enforces the law against the machine.

## Prolog Kernel Example

```prolog
%% syscall policy

allowed_syscall(lean_gate).
allowed_syscall(prolog_gate).
allowed_syscall(receipt_seal).
allowed_syscall(file_read).
allowed_syscall(build_check).

dangerous_syscall(bash_exec).
dangerous_syscall(curl_fetch).
dangerous_syscall(file_write).

requires_approval(bash_exec).
requires_approval(curl_fetch).
requires_approval(file_write).

requires_receipt(lean_gate).
requires_receipt(prolog_gate).
requires_receipt(build_check).
requires_receipt(receipt_seal).

valid_syscall(S) :-
    allowed_syscall(S).

valid_syscall(S) :-
    dangerous_syscall(S),
    requires_approval(S).

must_seal(S) :-
    requires_receipt(S).
```

## Lean 4 Gate Modes

The harness supports three Lean gate levels.

### 1. Browser Static Gate

Runs entirely in the browser.

This mode scans Lean files for proof-debt markers:

- `sorry`
- `admit`
- `axiom`
- `opaque`

It can classify a file as `CLEAN_SCAN`, `SPEC`, or `WARNING`.

It does not claim `PROVED`, because the browser static gate does not run the Lean kernel.

### 2. Local Lean Gate

Runs on the user's machine.

This mode executes:

```bash
lake build
rg -n "\bsorry\b|\badmit\b|\baxiom\b|\bopaque\b" .
```

Only the Local Lean Gate may promote a theorem to `PROVED`.

### 3. Experimental WASM Lean Gate

Future mode. This would require a browser-runnable Lean checker or Lean-compatible verification core compiled to WebAssembly. Until that exists in the harness, browser mode remains a static gate.

## Lean Gate Rule

```
Nemotron may request <|lean_gate|>.

Browser Static Gate may return:
- CLEAN_SCAN
- SPEC
- WARNING

Only Local Lean Gate may return:
- PROVED
- SPEC
- FAILED
- OBLIGATION
```

The browser gate can inspect. The local gate can verify.

## Extended Syscall Tokens

| Token | Meaning | Gate |
|-------|---------|------|
| `<\|lean_gate\|>` | Verify theorem/proof status through Lean 4 | Lean gate |
| `<\|prolog_gate\|>` | Validate symbolic policy or syscall permission | Prolog gate |
| `<\|emojicode_persona\|>` | Activate EmojiCode persona/control layer | Persona gate |
| `<\|tavily_search\|>` | Request Tavily web/search retrieval | Retrieval gate |
| `<\|google_search\|>` | Request Google programmable search retrieval | Retrieval gate |
| `<\|curl_fetch\|>` | Fetch a URL through controlled curl-like function | Network gate |
| `<\|bash_exec\|>` | Execute a local shell command | Sandbox gate |
| `<\|file_read\|>` | Read a local project file | File gate |
| `<\|file_write\|>` | Write or patch a local project file | File gate |
| `<\|build_check\|>` | Run build/test command | Build gate |
| `<\|receipt_seal\|>` | Seal action into receipt log | Receipt gate |
| `<\|reject_untrusted\|>` | Reject untrusted or unsealed data | Policy gate |
| `<\|kernel_verify\|>` | Crossing a trust boundary or validating a claim | Kernel gate |
| `<\|ere_check\|>` | Evaluating a formal artifact against ERE-5 rules | ERE gate |
| `<\|worm_seal_required\|>` | Output must be sealed into a WORM chain | Receipt gate |
| `<\|build_receipt\|>` | Build step produces an auditable artifact | Receipt gate |
| `<\|reject_unsealed\|>` | Input is unsealed and must be rejected | Policy gate |
| `<\|executor_mode\|>` | Operating in executor mode (no clarification) | Persona gate |

## EmojiCode Persona Layer

The harness supports an optional EmojiCode persona layer.

EmojiCode does not replace formal verification. It acts as a compact operator language for mode, tone, and execution posture.

| Emoji | Meaning |
|-------|---------|
| 🤖 | agent execution mode |
| 🧠 | reasoning mode |
| 🔒 | seal required |
| 🧪 | test required |
| 📜 | proof/status check |
| 🚫 | reject unsafe output |
| 🧾 | receipt required |
| ⚙️ | build step |
| 🕳️ | uncertainty / SPEC |
| ✅ | verified / passed gate |

Example persona directive:

```text
🤖⚙️🧾 Executor mode.
Do not ask clarification questions unless blocked.
Classify uncertainty as SPEC or OBLIGATION.
Seal all tool calls.
```

## Retrieval Is Untrusted

All Google, Tavily, curl, or web-derived content enters the harness as `RETRIEVAL_UNTRUSTED`.

Search results may inform a draft, but they cannot become authoritative until they are:

1. source-labeled
2. summarized
3. checked against the user task
4. passed through the policy gate
5. sealed into a receipt

The model may read search results. The model may not silently promote search results into truth.

## Runtime Modes

### Browser Demo Mode

Runs on GitHub Pages.

- Tau Prolog WASM policy gate
- Lean 4 browser static gate (scan only)
- Syscall extraction
- Receipt preview
- Replay hash demo

Does not execute local bash commands, access private API keys, or run `lake build`.

### Local Harness Mode

Runs on the user's machine.

- Ollama/Nemotron
- SWI-Prolog policy gate
- Lean 4 build gate (`lake build`)
- Controlled search
- Controlled curl
- Sandboxed bash
- SHA-256/BLAKE3 receipts
- Deterministic replay

Dangerous tools are disabled by default and must be explicitly enabled.

## Features

- Tau Prolog WASM policy gate (browser-native)
- Lean 4 browser static gate (scan-only)
- Local SWI-Prolog gate
- Local Lean 4 build gate
- Local Ollama/Nemotron support
- EmojiCode persona layer
- Executor-mode system prompt
- Co-string syscall parser
- Controlled search retrieval
- Sandboxed shell execution
- SHA-256/BLAKE3 receipts
- Determinism replay test
- Prompt templates
- Local-first frontend
- MIT licensed

## Quick Start

1. Install [Ollama](https://ollama.ai)
2. Pull or run a Nemotron-compatible model
3. Install dependencies
4. Start the harness
5. Open the UI
6. Send a task
7. Review syscall trace and receipt

## Install

```bash
git clone https://github.com/SNAPKITTYWEST/snapkitty-nemotron-harness
cd snapkitty-nemotron-harness
npm install
cp .env.example .env
npm run dev
```

## Example Prompt

```text
🤖⚙️🧾 Review this Lean theorem file.
Do not ask clarification questions.
Classify each theorem as PROVED, SPEC, or OBLIGATION.
Emit <|lean_gate|> when verification is required.
Seal all results.
```

## Core Rule

Questions are expensive. Execution is default. Uncertainty gets classified, not bounced back.

## Status Labels

**PROVED**: Machine-checked or compiler-checked proof.

**WITNESSED**: Runtime, compiler, or executable predicate supports the claim.

**SPEC**: The intended theorem or behavior is specified but not fully discharged.

**OBLIGATION**: External verifier, crypto assumption, simulator, runtime bridge, or manual receipt required.

**CLEAN_SCAN**: Browser static gate found no proof-debt markers. Not the same as PROVED.

## Claim Boundary

This harness does not prove model outputs are correct.

It provides a deterministic workflow for routing model outputs through policy gates, syscall tokens, and receipts.

## Roadmap

```
v0.2 — WASM Prolog + Lean Static Gate (current)
  Tau Prolog browser gate, Lean 4 scan-only gate, Policy Gate Panel, Lean Gate Panel

v0.3 — Local Lean Gate
  lake build + scanner, real PROVED/SPEC classification

v0.4 — GitHub Action Lean Gate
  remote CI receipt, shareable verification badge

v0.5 — Experimental Lean WASM Checker
  small proof-kernel verification in browser
```

## MIT License

This project is released under the MIT License. The harness is open. Your private models, prompts, receipts, and SnapKitty production systems remain separate.

Do not include private DevFlow code, private keys, private receipts, or SSL/FSL-only code inside the MIT repo unless you intentionally relicense that portion.
