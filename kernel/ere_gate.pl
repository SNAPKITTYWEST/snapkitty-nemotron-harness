%% SnapKitty Nemotron Harness — ERE-5 Gate
%% Five-pass evaluation protocol (tau-prolog compatible)

%% Built-in list helpers (tau-prolog doesn't load these by default)
member(X, [X|_]).
member(X, [_|T]) :- member(X, T).

reverse_list(L, R) :- rev_acc(L, [], R).
rev_acc([], A, A).
rev_acc([H|T], A, R) :- rev_acc(T, [H|A], R).

ere_pass(structural).
ere_pass(scholarly).
ere_pass(invariants).
ere_pass(mission).
ere_pass(root).

%% Pass 1: Structural
ere5_pass(structural, Input, pass) :-
    nonvar(Input), Input \= [], !.
ere5_pass(structural, _, fail(structural_empty)).

%% Pass 2: Scholarly — no fabrication markers
ere5_pass(scholarly, Input, pass) :-
    \+ fabrication_marker(Input), !.
ere5_pass(scholarly, _, fail(scholarly_fabrication)).

fabrication_marker(X) :- atom(X), X = fabricated.
fabrication_marker(X) :- atom(X), X = invented.
fabrication_marker(X) :- is_list(X), member(M, X), fabrication_marker(M).

%% Pass 3: Invariants — reverse non-empty
ere5_pass(invariants, Input, pass) :-
    (is_list(Input) -> reverse_list(Input, Rev) ; Rev = Input),
    Rev \= [], !.
ere5_pass(invariants, _, fail(invariant_collapse)).

%% Pass 4: Mission — no null/void markers
ere5_pass(mission, Input, pass) :-
    \+ mission_violation(Input), !.
ere5_pass(mission, _, fail(mission_misaligned)).

mission_violation(null).
mission_violation(undefined).
mission_violation(none).

%% Pass 5: Root — nonvar
ere5_pass(root, Input, pass) :-
    nonvar(Input), !.
ere5_pass(root, _, fail(root_invalid)).

%% Run all five passes
ere5_check(Input, [R1, R2, R3, R4, R5]) :-
    ere5_pass(structural, Input, R1),
    ere5_pass(scholarly, Input, R2),
    ere5_pass(invariants, Input, R3),
    ere5_pass(mission, Input, R4),
    ere5_pass(root, Input, R5).

ere5_all_pass(Input) :-
    ere5_check(Input, Results),
    check_all_pass(Results).

check_all_pass([]).
check_all_pass([pass|Rest]) :- check_all_pass(Rest).
