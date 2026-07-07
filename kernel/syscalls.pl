%% SnapKitty Nemotron Harness — Syscall Gate
%% Prolog validates all syscalls before execution.

allowed_syscall(kernel_verify).
allowed_syscall(ere_check).
allowed_syscall(worm_seal_required).
allowed_syscall(build_receipt).
allowed_syscall(reject_unsealed).
allowed_syscall(executor_mode).

requires_receipt(kernel_verify).
requires_receipt(ere_check).
requires_receipt(worm_seal_required).
requires_receipt(build_receipt).

valid_syscall(Syscall) :-
    allowed_syscall(Syscall).

valid_execution(Syscalls) :-
    forall(member(S, Syscalls), valid_syscall(S)).

%% ERE-5 five-pass check
ere_pass(structural).
ere_pass(scholarly).
ere_pass(invariants).
ere_pass(mission).
ere_pass(root).

valid_ere_pass(Pass) :-
    ere_pass(Pass).

ere_all_pass([]).
ere_all_pass([P|Ps]) :-
    valid_ere_pass(P),
    ere_all_pass(Ps).
