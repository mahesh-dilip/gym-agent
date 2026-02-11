-- Per-set weight/rep tracking
-- When sets vary (e.g. 26x15, 30x15, 30x20), stores [{set_number, weight, reps}]
-- Stays null when all sets are identical (existing scalar columns suffice)
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS set_details JSONB;
