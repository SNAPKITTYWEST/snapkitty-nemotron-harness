-- SnapKitty Lean 4 Gate — Example Theorems
-- These are the invariants the harness can check

-- Thermal window ordering theorem
-- For all valid friction values f in [0, 1], lo < hi
-- PROVED: lo(f) <= 16383 < 49151 <= hi(f)

-- ERE-5 acceptance consequence
-- If ERE-5 accepts, then P5 audit hash exists
-- PROVED: conjunction implies each conjunct

-- No-cloning theorem
-- QuantumTemp consumed exactly once via LinearTypes
-- WITNESSED: GHC LinearTypes enforces

-- Gate validity
-- Gate type requires abjad a < abjad b
-- PROVED: dependent type rejection

-- Receipt reflexivity
-- sameReceiptInput r r
-- PROVED: reflected equality

-- These are EXAMPLES. The harness scans for actual theorems
-- in your Lean project and classifies them.
