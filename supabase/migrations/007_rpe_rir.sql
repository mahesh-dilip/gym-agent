-- Add RPE (Rate of Perceived Exertion) and RIR (Reps In Reserve) columns to exercise_logs
-- RPE: 1-10 scale (10 = maximum effort / failure)
-- RIR: 0-10 scale (0 = failure, higher = more reps left)
-- These are scalar fields for when all sets share the same RPE/RIR.
-- Per-set RPE/RIR lives inside the set_details JSONB (no migration needed for that).

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS rpe NUMERIC CHECK (rpe >= 1 AND rpe <= 10);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS rir NUMERIC CHECK (rir >= 0 AND rir <= 10);
