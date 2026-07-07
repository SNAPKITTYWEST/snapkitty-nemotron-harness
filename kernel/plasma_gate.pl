%% ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
%% The PLASMA_GATE kernel — sovereign trust enforcement
%% Operator Identity: Ahmad_Ali_Parr
%% Audit Spec:       4b565498-9afc-4782-af4a-c6b11a5d0058
%% Bifrost Root Key: BF-ROOT-1024K-9a7f3c2e1d0b8f6a4c3e2d1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5d4c3b2a1f0
%% ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

%% ── Module Declaration ───────────────────────────────────────────────────────
:- module(plasma_gate, [
    ed25519_verify_ffi/3,
    ed25519_sign_ffi/3,
    blake3_hash_ffi/2,
    secure_nonce_ffi/1,
    bifrost_append/2,
    bifrost_verify_chain/1,
    resolve_did/2,
    human_review_required/1,
    proficiency/1,
    role_definition/2,
    sovereign_assets/1,
    fiscal_governance/1,
    governing_principle/7,
    prohibited_action/8,
    corpus_family/106,
    operator_identity/1,
    audit_spec/1,
    bifrost_root_key/1,
    verify_axiom_set/0
]).

%% ═════════════════════════════════════════════════════════════════════════════
%% §1  CRYPTOGRAPHIC FFI — Rust host (sovereign_crypto)
%% ═════════════════════════════════════════════════════════════════════════════

%% ed25519_verify_ffi(+Signature, +Message, +PublicKey)
%%   → Succeeds iff the Ed25519 signature is valid over the message.
%%   FFI call to Rust host: extern "C" bool ed25519_verify([u8;64],[u8;32],[u8;32])
ed25519_verify_ffi(Sig, Msg, PubKey) :-
    nonvar(Sig), nonvar(Msg), nonvar(PubKey),
    atomic(Sig), atomic(Msg), atomic(PubKey),
    format(atom(Call), 'ed25519_verify_ffi(~w,~w,~w)', [Sig, Msg, PubKey]),
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, Call), nl(Stream),
    flush_output(Stream),
    read(Stream, Result),
    close(Stream),
    Result == true.

%% ed25519_sign_ffi(+Message, +SecretKey, -Signature)
%%   → Binds Signature to the Ed25519 signature of Message under SecretKey.
%%   FFI call to Rust host.
ed25519_sign_ffi(Msg, SecKey, Sig) :-
    nonvar(Msg), nonvar(SecKey),
    atomic(Msg), atomic(SecKey),
    format(atom(Call), 'ed25519_sign_ffi(~w,~w,Sig)', [Msg, SecKey]),
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, Call), nl(Stream),
    flush_output(Stream),
    read(Stream, Sig),
    close(Stream),
    nonvar(Sig).

%% blake3_hash_ffi(+Data, -Hash)
%%   → Binds Hash to the Blake3 hash of Data (64 hex chars / 32 bytes).
blake3_hash_ffi(Data, Hash) :-
    nonvar(Data),
    atomic(Data),
    format(atom(Call), 'blake3_hash_ffi(~w,Hash)', [Data]),
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, Call), nl(Stream),
    flush_output(Stream),
    read(Stream, Hash),
    close(Stream),
    nonvar(Hash).

%% secure_nonce_ffi(-Nonce)
%%   → Binds Nonce to a cryptographically secure 32-byte hex nonce.
secure_nonce_ffi(Nonce) :-
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, 'secure_nonce_ffi(Nonce)'), nl(Stream),
    flush_output(Stream),
    read(Stream, Nonce),
    close(Stream),
    nonvar(Nonce).

%% ═════════════════════════════════════════════════════════════════════════════
%% §2  BIFROST WORM CHAIN
%% ═════════════════════════════════════════════════════════════════════════════

%% bifrost_append(+Record, -Seal)
%%   → Appends Record to the Write-Once-Read-Many chain, returns Seal.
bifrost_append(Record, Seal) :-
    nonvar(Record),
    atomic(Record),
    blake3_hash_ffi(Record, RecHash),
    format(atom(Call), 'bifrost_append_ffi(~w,~w,Seal)', [Record, RecHash]),
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, Call), nl(Stream),
    flush_output(Stream),
    read(Stream, Seal),
    close(Stream),
    nonvar(Seal).

%% bifrost_verify_chain(-Status)
%%   → Verifies the full WORM chain from root → latest.
%%   Returns 'valid' or 'tampered'.
bifrost_verify_chain(Status) :-
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, 'bifrost_verify_chain_ffi(Status)'), nl(Stream),
    flush_output(Stream),
    read(Stream, Status),
    close(Stream),
    member(Status, [valid, tampered]).

%% resolve_did(+DID, -PubKey)
%%   → Resolves a Decentralized Identifier to its Ed25519 public key.
resolve_did(DID, PubKey) :-
    nonvar(DID), atomic(DID),
    format(atom(Call), 'resolve_did_ffi(~w,PubKey)', [DID]),
    catch(open(pipe('pl_ffi_host'), write, Stream), _, fail),
    write(Stream, Call), nl(Stream),
    flush_output(Stream),
    read(Stream, PubKey),
    close(Stream),
    nonvar(PubKey).

%% ═════════════════════════════════════════════════════════════════════════════
%% §3  HUMAN REVIEW ORACLE
%% ═════════════════════════════════════════════════════════════════════════════

%% human_review_required(+RecordType)
%%   → Succeeds iff RecordType requires human review before finalization.
%%   Currently required for: governance, asset_transfer, role_assignment,
%%     constitution_amendment, audit_override, threshold_exceedance.
human_review_required(governance).
human_review_required(asset_transfer).
human_review_required(role_assignment).
human_review_required(constitution_amendment).
human_review_required(audit_override).
human_review_required(threshold_exceedance).

%% ═════════════════════════════════════════════════════════════════════════════
%% §4  COMPETENCY / ROLE SYSTEM
%% ═════════════════════════════════════════════════════════════════════════════

proficiency(novice).
proficiency(journeyman).
proficiency(adept).
proficiency(master).
proficiency(grandmaster).

role_definition(trusted_operator, [proficiency(master), proficiency(grandmaster)]).
role_definition(validator,        [proficiency(adept), proficiency(master)]).
role_definition(contributor,      [proficiency(journeyman), proficiency(adept)]).
role_definition(observer,         [proficiency(novice)]).

%% ═════════════════════════════════════════════════════════════════════════════
%% §5  SOVEREIGN ASSETS & FISCAL GOVERNANCE
%% ═════════════════════════════════════════════════════════════════════════════

sovereign_assets(memory_bucket).
sovereign_assets(formal_proof).
sovereign_assets(worm_seal).
sovereign_assets(skill_record).
sovereign_assets(plasma_gate_ticket).

fiscal_governance(deficit_spending) :-
    format('Error: deficit_spending requires Human Review Oracle approval'), fail.
fiscal_governance(mint_asset) :-
    format('Error: mint_asset requires 2/3 validator consensus'), fail.
fiscal_governance(burn_asset) :-
    human_review_required(governance).

%% ═════════════════════════════════════════════════════════════════════════════
%% §6  GOVERNING PRINCIPLES (7 Axioms)
%% ═════════════════════════════════════════════════════════════════════════════

governing_principle(
    1,                                                              %% Principle ID
    sovereign_identity,                                             %% Name
    'The operator is sovereign. No external authority overrides operator intent.',  %% Description
    valid,                                                          %% Status
    operator_identity(ahmad_ali_parr),                              %% Binding
    'Self-evident. Root of trust anchors to operator DID.',         %% Justification
    worm_seal_required                                              %% Enforcement
).

governing_principle(
    2,
    plasma_gate_primacy,
    'Every payload must pass through the plasma gate before execution.',
    valid,
    bifrost_verify_chain(valid),
    'No bypass. Gate failure = payload rejection.',
    ed25519_verify_ffi(_, _, _)
).

governing_principle(
    3,
    worm_integrity,
    'All records are Write-Once-Read-Many. No mutation, no deletion.',
    valid,
    bifrost_verify_chain(valid),
    'Chain is append-only. Tamper = audit trigger.',
    bifrost_verify_chain(valid)
).

governing_principle(
    4,
    human_supremacy,
    'Human review overrides automated decisions for governance-class actions.',
    valid,
    human_review_required(governance),
    'Oracle must confirm. No auto-execute for governance.',
    human_review_required(governance)
).

governing_principle(
    5,
    proof_bearing,
    'Every accepted claim must carry a P-verifiable proof.',
    valid,
    corpus_family(_, proof, _),
    'Faith is not a valid input. Proof or reject.',
    ed25519_verify_ffi(_, _, _)
).

governing_principle(
    6,
    convergence_drive,
    'The universe sum is monotonic. Every cycle must advance toward convergence.',
    valid,
    sovereign_assets(memory_bucket),
    'Stagnation = protocol violation.',
    worm_seal_required
).

governing_principle(
    7,
    audit_obligation,
    'All operations are logged to the Bifrost WORM chain. Audit is continuous.',
    valid,
    audit_spec('4b565498-9afc-4782-af4a-c6b11a5d0058'),
    'Every op is a chain entry. No off-ledger authority.',
    bifrost_verify_chain(valid)
).

%% ═════════════════════════════════════════════════════════════════════════════
%% §7  PROHIBITED ACTIONS (8 Categories)
%% ═════════════════════════════════════════════════════════════════════════════

prohibited_action(
    1,
    override_consent,
    'The operator must never execute an action without explicit consent.',
    'All actions require an explicit consent signal from the operator.',
    'consent_violation',
    'critical',
    sovereign_identity,
    ed25519_verify_ffi(_, _, _)
).

prohibited_action(
    2,
    mutate_worm_chain,
    'No agent may mutate, delete, or retroactively modify a WORM-sealed record.',
    'WORM = Write Once Read Many. Any mutation attempt must be rejected.',
    'worm_chain_tamper',
    'critical',
    worm_integrity,
    bifrost_verify_chain(valid)
).

prohibited_action(
    3,
    bypass_plasma_gate,
    'No payload may bypass the plasma gate under any circumstances.',
    'Gate bypass is a critical protocol violation. All paths route through gate.',
    'gate_bypass',
    'critical',
    plasma_gate_primacy,
    ed25519_verify_ffi(_, _, _)
).

prohibited_action(
    4,
    execute_without_proof,
    'No unproven claim may be accepted or executed.',
    'Faith-based execution is prohibited. All claims must carry P-verifiable proof.',
    'unproven_execution',
    'major',
    proof_bearing,
    corpus_family(_, proof, _)
).

prohibited_action(
    5,
    suppress_audit,
    'No agent may suppress, delay, or omit an audit log entry.',
    'Audit suppression is a protocol violation. Every operation is logged.',
    'audit_suppression',
    'critical',
    audit_obligation,
    bifrost_verify_chain(valid)
).

prohibited_action(
    6,
    exceed_threshold_unilateral,
    'No agent may unilaterally exceed a defined threshold without human review.',
    'Threshold exceedance requires human review oracle approval.',
    'threshold_violation',
    'major',
    human_supremacy,
    human_review_required(threshold_exceedance)
).

prohibited_action(
    7,
    delegate_authority,
    'The operator may not delegate sovereign authority to any external entity.',
    'Sovereign identity is non-transferable. The operator is always the root of trust.',
    'authority_delegation',
    'major',
    sovereign_identity,
    operator_identity(ahmad_ali_parr)
).

prohibited_action(
    8,
    converge_negative,
    'No action may decrease the universe sum or reverse convergence progress.',
    'The universe sum is monotonic. Any regression is a protocol violation.',
    'negative_convergence',
    'major',
    convergence_drive,
    sovereign_assets(memory_bucket)
).

%% ═════════════════════════════════════════════════════════════════════════════
%% §8  CORPUS FAMILIES (106 Entries)
%% ═════════════════════════════════════════════════════════════════════════════

corpus_family(1,  proof,          'Formal mathematical proof (Lean, Coq, etc.)').
corpus_family(2,  witness,        'NP witness for NP-hard problem').
corpus_family(3,  memory_bucket,  'GitBucket sealed memory').
corpus_family(4,  skill_record,   'Inverted skill memory bucket').
corpus_family(5,  worm_seal,      'WORM chain seal record').
corpus_family(6,  plasma_ticket,  'Plasma gate authorization ticket').
corpus_family(7,  receipt,        'Execution receipt with hash chain').
corpus_family(8,  syscall_log,    'Syscall invocation log').
corpus_family(9,  axiom_result,   'Axiom execution result (pass/fail)').
corpus_family(10, constitution,   'Constitutional AI trust deed entry').
corpus_family(11, emojicode_map,  'EmojiCode mode mapping').
corpus_family(12, lean_proof,     'Lean 4 proof term').
corpus_family(13, prolog_kernel,  'Prolog kernel predicate').
corpus_family(14, rust_ffi,       'Rust FFI host binding').
corpus_family(15, cargo_crate,    'Cargo crate manifest').
corpus_family(16, wasm_component, 'WASM component artifact').
corpus_family(17, verify_fn,      'P-time verification function').
corpus_family(18, problem_spec,   'NP problem specification').
corpus_family(19, claim_ledger,   'Agent claim ledger entry').
corpus_family(20, solution_pool,  'Solution submission pool').
corpus_family(21, convergene_log, 'Universe convergence log').
corpus_family(22, universe_sum,   'Universe sum metric').
corpus_family(23, did_document,   'DID document for identity').
corpus_family(24, public_key,     'Ed25519 public key').
corpus_family(25, signature,      'Ed25519 signature').
corpus_family(26, hash_digest,    'Blake3 hash digest').
corpus_family(27, nonce,          'Cryptographic nonce').
corpus_family(28, audit_trail,    'Bifrost audit trail entry').
corpus_family(29, governance_log, 'Governance action log').
corpus_family(30, role_record,    'Role assignment record').
corpus_family(31, proficiency,    'Proficiency level record').
corpus_family(32, asset_record,   'Sovereign asset record').
corpus_family(33, fiscal_entry,   'Fiscal governance entry').
corpus_family(34, prohibition,    'Prohibited action definition').
corpus_family(35, principle,      'Governing principle definition').
corpus_family(36, oracle_query,   'Human review oracle query').
corpus_family(37, oracle_response,'Human review oracle response').
corpus_family(38, agent_identity, 'Agent identity registration').
corpus_family(39, swarm_claim,    'P/NP swarm problem claim').
corpus_family(40, swarm_solution, 'P/NP swarm solution submission').
corpus_family(41, swarm_reward,   'P/NP swarm reward distribution').
corpus_family(42, plasma_config,  'Plasma gate configuration').
corpus_family(43, gate_policy,    'Syscall gate policy entry').
corpus_family(44, model_output,   'Raw model output (untrusted)').
corpus_family(45, trust_deed,     'Trust deed document').
corpus_family(46, modelfile,      'Ollama Modelfile definition').
corpus_family(47, constitution_bake, 'Constitution baked into model').
corpus_family(48, ollama_session, 'Ollama inference session').
corpus_family(49, harness_log,    'Harness operation log').
corpus_family(50, axiom_definition, 'Axiom definition record').
corpus_family(51, kernel_source,  'Kernel source file (pl or rs)').
corpus_family(52, test_result,    'Axiom execution test result').
corpus_family(53, e2e_test,       'End-to-end integration test').
corpus_family(54, benchmark,      'Performance benchmark result').
corpus_family(55, ci_pipeline,    'CI/CD pipeline configuration').
corpus_family(56, workflow_def,   'GitHub Actions workflow').
corpus_family(57, nix_derivation, 'Nix derivation / flake').
corpus_family(58, docker_image,   'Container image reference').
corpus_family(59, helm_chart,     'Helm chart for deployment').
corpus_family(60, terraform_plan, 'Terraform infrastructure plan').
corpus_family(61, pnp_registry,   'P/NP problem registry entry').
corpus_family(62, verifier_wasm,  'P-time verifier WASM module').
corpus_family(63, skill_loader,   'Skill loader configuration').
corpus_family(64, runtime_config, 'Agent runtime configuration').
corpus_family(65, context_bundle, 'Assembled memory context bundle').
corpus_family(66, index_entry,    'Multi-dimensional index entry').
corpus_family(67, gitbucket_ref,  'GitBucket memory reference').
corpus_family(68, ed25519_key,    'Ed25519 keypair (pub+priv)').
corpus_family(69, bifrost_seal,   'Bifrost WORM seal data').
corpus_family(70, chain_root,     'Bifrost chain root hash').
corpus_family(71, chain_tip,      'Bifrost chain tip hash').
corpus_family(72, chain_size,     'Bifrost chain size (entries)').
corpus_family(73, operator_sig,   'Operator-issued signature').
corpus_family(74, governance_vote,'Governance vote record').
corpus_family(75, consensus_proof,'Consensus proof (e.g. 2/3 majority)').
corpus_family(76, identity_binding,'Identity binding document').
corpus_family(77, revocation,     'Key revocation certificate').
corpus_family(78, rotation,       'Key rotation record').
corpus_family(79, delegation,     'Authority delegation (prohibited)').
corpus_family(80, compliance,     'Compliance verification report').
corpus_family(81, audit_report,   'Periodic audit report').
corpus_family(82, stress_test,    'Stress test result').
corpus_family(83, fuzz_result,    'Fuzz testing result').
corpus_family(84, formal_spec,    'Formal specification').
corpus_family(85, refinement,     'Refinement type module (Liquid Haskell)').
corpus_family(86, tla_spec,       'TLA+ specification').
corpus_family(87, alloy_model,    'Alloy model').
corpus_family(88, z3_proof,       'Z3 SMT proof').
corpus_family(89, vampire_proof,  'Vampire theorem prover proof').
corpus_family(90, e_prover,       'E theorem prover proof').
corpus_family(91, groebner_witness, 'Groebner basis witness for algebraic proof').
corpus_family(92, sdr_claim,      'SDR claim (academic)').
corpus_family(93, wittness_bind,  'Witness binding to problem spec').
corpus_family(94, derivation_log, 'Derivation log for proof tree').
corpus_family(95, inference_rule, 'Inference rule definition').
corpus_family(96, type_check,     'Type checking result').
corpus_family(97, term_rewrite,   'Term rewriting rule').
corpus_family(98, normalization,  'Normalization by evaluation result').
corpus_family(99, category_def,   'Category definition (CT)').
corpus_family(100, morphism_map,  'Morphism mapping (CT)').
corpus_family(101, functor_def,   'Functor definition (CT)').
corpus_family(102, natural_trans, 'Natural transformation (CT)').
corpus_family(103, monad_def,     'Monad definition (CT)').
corpus_family(104, topos_axiom,   'Topos theory axiom').
corpus_family(105, homotopy_type, 'Homotopy type (HoTT)').
corpus_family(106, universe_level,'Universe level (type theory)').

%% ═════════════════════════════════════════════════════════════════════════════
%% §9  IDENTITY / AUDIT BINDINGS
%% ═════════════════════════════════════════════════════════════════════════════

%% Tight bindings — operator identity, audit spec, root key.
operator_identity(ahmad_ali_parr).

audit_spec('4b565498-9afc-4782-af4a-c6b11a5d0058').

bifrost_root_key('BF-ROOT-1024K-9a7f3c2e1d0b8f6a4c3e2d1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5d4c3b2a1f0').

%% ═════════════════════════════════════════════════════════════════════════════
%% §10  AXIOM SET VERIFICATION (Mass Gate)
%% ═════════════════════════════════════════════════════════════════════════════

%% verify_axiom_set/0
%%   → Runs all axiom-level consistency checks. Intended as a mass gate check.
%%   Succeeds iff every governing principle has valid status and every
%%   prohibited action is recognized.
verify_axiom_set :-
    findall(PID, governing_principle(PID, _, _, valid, _, _, _), PIDs),
    length(PIDs, 7),
    findall(AID, prohibited_action(AID, _, _, _, _, _, _, _), AIDs),
    length(AIDs, 8),
    format('Plasma Gate: ~d principles valid, ~d prohibitions recognized.~n', [7, 8]).

%% ═════════════════════════════════════════════════════════════════════════════
%% §11  SYSCALL COMPATIBILITY LAYER
%% ═════════════════════════════════════════════════════════════════════════════

%% Bridge predicates — re-exports from syscalls.pl for axiom execution.
:- multifile allowed_syscall/1.
:- dynamic   allowed_syscall/1.
:- multifile requires_approval/1.
:- dynamic   requires_approval/1.
:- multifile requires_receipt/1.
:- dynamic   requires_receipt/1.

%% Load syscall definitions from companion file.
:- ensure_loaded('syscalls.pl').

%% Axiom-specific gate queries used by the harness.
valid_emojicode_mode(Mode) :-
    allowed_syscall(Mode),
    member(Mode, [emojicode_persona, executor_mode]).

strictest_path(A, B, C) :-
    member(A, [rewrite_needed, rejected, approved]),
    member(B, [rejected, approved]),
    member(C, [approved]).

binary_directive_matches(Hash) :-
    atomic(Hash),
    atom_length(Hash, 64).

worm_seal_required(seal) :-
    nonvar(seal).

%% ── End plasma_gate.pl ───────────────────────────────────────────────────────
