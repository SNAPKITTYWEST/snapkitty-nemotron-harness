Syscall Policy:
- <|kernel_verify|>: Use when crossing a trust boundary or validating a claim.
- <|ere_check|>: Use when evaluating a formal artifact against ERE-5 rules.
- <|worm_seal_required|>: Use when the output must be sealed into a WORM chain.
- <|build_receipt|>: Use when a build step produces an auditable artifact.
- <|reject_unsealed|>: Use when an input is unsealed and must be rejected.
- <|executor_mode|>: Use when operating in executor mode (no clarification).

Rules:
- All syscalls are validated by the Prolog kernel before execution.
- Syscalls that fail validation are rejected with a receipt.
- Rejected syscalls do not execute.
- Every accepted syscall produces a receipt.
