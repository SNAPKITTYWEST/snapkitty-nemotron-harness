# SnapKitty Nemotron Harness

A deterministic local harness for running Nemotron/Ollama as a governed agent with EmojiCode persona control, syscall-style tool gates, Lean 4 proof checks, Prolog policy validation, controlled retrieval, sandboxed shell execution, and sealed receipts.

This is not a chatbot wrapper.

Nemotron reasons. EmojiCode sets the posture. Lean verifies. Prolog gates. Tools execute only by syscall. The receipt decides.

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

```
User / IDE
  ↓
SnapKitty Persona Layer
  - EmojiCode behavior map
  - executor mode
  - clarification-drag suppression
  - PROVED / WITNESSED / SPEC / OBLIGATION discipline

  ↓
Nemotron / Ollama
  - local reasoning engine
  - deterministic generation settings
  - no authority by default

  ↓
Co-String Syscall Layer
  - <|lean_gate|>
  - <|prolog_gate|>
  - <|tavily_search|>
  - <|google_search|>
  - <|curl_fetch|>
  - <|bash_exec|>
  - <|worm_seal_required|>

  ↓
Tool Gate Layer
  - Lean 4 theorem check
  - Prolog policy validation
  - search result quarantine
  - curl allowlist
  - bash sandbox

  ↓
Receipt Layer
  - prompt hash
  - output hash
  - tool-call hash
  - search-source hash
  - build-result hash
  - WORM receipt
```

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

## Lean 4 Gate

The Lean 4 gate is used for theorem-status verification.

It classifies proof artifacts as:

- `PROVED` — `lake build` succeeds and no `sorry`, `admit`, unchecked `axiom`, or unchecked `opaque` is present.
- `SPEC` — theorem statement exists but proof debt remains.
- `OBLIGATION` — claim depends on external verifier, runtime bridge, cryptographic assumption, or simulator.

Example command:

```bash
lake build
rg -n "\bsorry\b|\badmit\b|\baxiom\b|\bopaque\b" .
```

The harness never allows Nemotron to call something "proved" unless the Lean gate agrees.

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

Runs on GitHub Pages. This mode demonstrates prompt flow, syscall extraction, and receipt visualization. It does not execute local bash commands or access private API keys.

### Local Harness Mode

Runs on the user's machine. This mode enables Ollama, Lean 4 checks, Prolog gates, controlled search, curl fetches, bash execution, and receipt writing.

Dangerous tools are disabled by default and must be explicitly enabled.

## Bash Safety

Bash execution is disabled by default.

When enabled, bash runs in workspace-only mode and requires confirmation.

Denied by default:

- `rm -rf`
- `sudo`
- credential reads
- private key reads
- destructive git commands
- system package changes
- commands outside the workspace

The harness is not a remote shell. It is a controlled local build tool.

## Curl / Fetch Safety

Curl-style fetches are disabled by default.

When enabled:

- GET is allowed by default
- POST requires approval
- private IP ranges are blocked unless explicitly enabled
- response bodies are marked `RETRIEVAL_UNTRUSTED`
- fetched content is hashed and attached to the receipt

## Features

- Local Ollama/Nemotron support
- EmojiCode persona layer
- Executor-mode system prompt
- Co-string syscall parser
- Lean 4 theorem gate
- Prolog validation layer
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

## Claim Boundary

This harness does not prove model outputs are correct.

It provides a deterministic workflow for routing model outputs through policy gates, syscall tokens, and receipts.

## Roadmap

```
v0.1 — Current shell
  prompt console, syscall extraction, receipt display

v0.2 — Persona + EmojiCode
  persona editor, EmojiCode mode, executor-mode presets

v0.3 — Lean + Prolog gates
  run lake build, scan sorry/admit/axiom/opaque, Prolog policy gate

v0.4 — Search tools
  Tavily search, Google search, search result quarantine, source hash receipts

v0.5 — Curl + Bash
  controlled curl, sandboxed bash, approval modal, tool-output receipts

v0.6 — Harness for others
  template library, export receipt bundle, replay mode, MIT release
```

## MIT License

This project is released under the MIT License. The harness is open. Your private models, prompts, receipts, and SnapKitty production systems remain separate.

Do not include private DevFlow code, private keys, private receipts, or SSL/FSL-only code inside the MIT repo unless you intentionally relicense that portion.
