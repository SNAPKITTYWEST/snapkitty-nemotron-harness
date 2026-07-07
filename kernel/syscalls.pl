%% SnapKitty Nemotron Harness — Syscall Gate + Axiom Predicates
allowed_syscall(lean_gate).
allowed_syscall(prolog_gate).
allowed_syscall(emojicode_persona).
allowed_syscall(tavily_search).
allowed_syscall(google_search).
allowed_syscall(curl_fetch).
allowed_syscall(bash_exec).
allowed_syscall(file_read).
allowed_syscall(file_write).
allowed_syscall(build_check).
allowed_syscall(receipt_seal).
allowed_syscall(reject_untrusted).
allowed_syscall(kernel_verify).
allowed_syscall(ere_check).
allowed_syscall(worm_seal_required).
allowed_syscall(build_receipt).
allowed_syscall(reject_unsealed).
allowed_syscall(executor_mode).

requires_approval(bash_exec).
requires_approval(curl_fetch).
requires_approval(file_write).

requires_receipt(lean_gate).
requires_receipt(prolog_gate).
requires_receipt(build_check).
requires_receipt(receipt_seal).
requires_receipt(worm_seal_required).

valid_syscall(S) :- allowed_syscall(S).
valid_execution([]).
valid_execution([S|Rest]) :- valid_syscall(S), valid_execution(Rest).

%% Axiom predicates
valid_emojicode_mode(emojicode_persona) :- allowed_syscall(emojicode_persona).
strictest_path(rewrite_needed, _, _) :- true.
strictest_path(_, rejected, _) :- true.
strictest_path(_, _, approved) :- true.
binary_directive_matches(sha256) :- true.
worm_seal_required(X) :- X = test.
