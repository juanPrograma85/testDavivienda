BEGIN;

ALTER TABLE flight.flights
  DROP CONSTRAINT IF EXISTS flights_base_fare_cents_check;

UPDATE flight.flights
SET base_fare_cents = base_fare_cents / 100,
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE flight.flights
  RENAME COLUMN base_fare_cents TO base_fare;

ALTER TABLE flight.flights
  ADD CONSTRAINT flights_base_fare_check CHECK (base_fare >= 0);

ALTER TABLE payment.payments
  DROP CONSTRAINT IF EXISTS payments_amount_in_cents_check;

UPDATE payment.payments
SET amount_in_cents = amount_in_cents / 100,
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE payment.payments
  RENAME COLUMN amount_in_cents TO amount;

ALTER TABLE payment.payments
  ADD CONSTRAINT payments_amount_check CHECK (amount > 0);

COMMIT;