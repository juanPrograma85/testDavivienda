BEGIN;

ALTER TABLE seat_inventory.seats
  ADD COLUMN IF NOT EXISTS user_name VARCHAR(120);

UPDATE seat_inventory.seats
SET status = 'AVAILABLE',
    hold_id = NULL,
    holder_id = NULL,
    user_document = NULL,
    hold_expires_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'HELD' AND user_name IS NULL;

ALTER TABLE seat_inventory.seats
  DROP CONSTRAINT IF EXISTS chk_seat_hold_consistency;

ALTER TABLE seat_inventory.seats
  DROP COLUMN IF EXISTS holder_id;

ALTER TABLE seat_inventory.seats
  ADD CONSTRAINT chk_seat_hold_consistency CHECK (
    (
      status = 'HELD'
      AND hold_id IS NOT NULL
      AND user_name IS NOT NULL
      AND user_document IS NOT NULL
      AND hold_expires_at IS NOT NULL
    )
    OR (
      status <> 'HELD'
      AND hold_id IS NULL
      AND user_name IS NULL
      AND user_document IS NULL
      AND hold_expires_at IS NULL
    )
  );

COMMIT;