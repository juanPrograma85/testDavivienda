BEGIN;

UPDATE flight.flights
SET base_fare_cents = base_fare_cents * 100,
    currency = 'COP',
    updated_at = CURRENT_TIMESTAMP
WHERE currency <> 'COP';

UPDATE payment.payments
SET currency = 'COP',
    updated_at = CURRENT_TIMESTAMP
WHERE currency <> 'COP';

ALTER TABLE flight.flights
  DROP CONSTRAINT IF EXISTS chk_flight_currency_cop,
  ADD CONSTRAINT chk_flight_currency_cop CHECK (currency = 'COP');

ALTER TABLE payment.payments
  DROP CONSTRAINT IF EXISTS chk_payment_currency_cop,
  ADD CONSTRAINT chk_payment_currency_cop CHECK (currency = 'COP');

COMMIT;