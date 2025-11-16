-- Migration 008: Add UNIQUE constraint to usage_records table
-- ============================================
-- Description:
--   Adds UNIQUE constraint on (user_id, year, month) to usage_records table
--   This constraint is required for ON CONFLICT clauses in increment functions
--
-- Problem:
--   - increment_usage and increment_usage_counter use ON CONFLICT (user_id, year, month)
--   - But this constraint doesn't exist in the table
--   - Without it, ON CONFLICT fails and creates duplicate records or errors
--
-- Solution:
--   - Add UNIQUE constraint to prevent duplicate month records per user
--   - Ensures atomic UPSERT operations work correctly
--
-- Impact:
--   - Enables proper quota tracking with no duplicates
--   - Allows increment functions to work as intended
-- ============================================

-- Add UNIQUE constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usage_records_user_period_unique'
  ) THEN
    ALTER TABLE public.usage_records
    ADD CONSTRAINT usage_records_user_period_unique
    UNIQUE (user_id, year, month);

    RAISE NOTICE 'Added UNIQUE constraint usage_records_user_period_unique';
  ELSE
    RAISE NOTICE 'UNIQUE constraint usage_records_user_period_unique already exists';
  END IF;
END$$;

-- Add comment to constraint
COMMENT ON CONSTRAINT usage_records_user_period_unique ON public.usage_records IS
  'Ensures one usage record per user per month. Required for ON CONFLICT in increment functions.';

-- ============================================
-- Verification query (for manual testing)
-- ============================================

-- Verify constraint exists
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'usage_records'::regclass
-- AND conname = 'usage_records_user_period_unique';
