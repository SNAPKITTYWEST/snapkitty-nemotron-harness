# SnapKitty Nemotron Harness

A local deterministic harness for running Nemotron/Ollama as a governed agent inside a receipt-producing workflow.

This is not a chatbot wrapper.

The harness treats the model as an untrusted compute resource. Model outputs are parsed for syscall-style control tokens, checked against a Prolog policy gate, and sealed into local JSON receipts for replay and audit.

Nemotron reasons.
SnapKitty gates.
The receipt decides.

## What This Is

This is not a chatbot wrapper.

This harness treats the LLM as an untrusted compute resource. Authority is handled by:

- Co-string syscall tokens
- Prolog policy gates
- Deterministic execution settings
- SHA-256/BLAKE3 receipts
- Replayable prompt/output hashes

Nemotron reasons. SnapKitty gates. The harness writes the receipt.

## Why It Exists

Most AI tools return text and lose the reasoning trail.

This harness creates a local workflow where every important agent action can be classified, checked, and sealed.

The pattern is:

```
prompt
→ model response
→ syscall extraction
→ Prolog gate
→ receipt seal
→ replay / audit
```

## Features

- Local Ollama/Nemotron support
- Executor-mode system prompt
- Co-string syscall parser
- Prolog validation layer
- Receipt writer
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

## Environment

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=nemotron
RECEIPT_DIR=./receipts
HARNESS_MODE=executor
```

## Example Prompt

```text
Review this Lean theorem file.
Do not ask clarification questions.
Classify each theorem as PROVED, SPEC, or OBLIGATION.
Emit syscall tokens when verification is required.
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

## Architecture

```
IDE prompt
→ Nemotron/Ollama
→ co-string syscall parser
→ Prolog gate
→ optional WASM sidecar
→ hash/sign/seal receipt
→ response returned to IDE
```

## Syscall Tokens

| Token | Meaning |
|-------|---------|
| `<\|kernel_verify\|>` | Crossing a trust boundary or validating a claim |
| `<\|ere_check\|>` | Evaluating a formal artifact against ERE-5 rules |
| `<\|worm_seal_required\|>` | Output must be sealed into a WORM chain |
| `<\|build_receipt\|>` | Build step produces an auditable artifact |
| `<\|reject_unsealed\|>` | Input is unsealed and must be rejected |
| `<\|executor_mode\|>` | Operating in executor mode (no clarification) |

## MIT License

This project is released under the MIT License. The harness is open. Your private models, prompts, receipts, and SnapKitty production systems remain separate.

Do not include private DevFlow code, private keys, private receipts, or SSL/FSL-only code inside the MIT repo unless you intentionally relicense that portion.
