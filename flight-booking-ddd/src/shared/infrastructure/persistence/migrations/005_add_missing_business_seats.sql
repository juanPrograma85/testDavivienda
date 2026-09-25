BEGIN;

INSERT INTO seat_inventory.seats (
  flight_id,
  seat_number,
  cabin_class,
  status
)
SELECT
  flight.id,
  row_number::text || column_name,
  'BUSINESS'::seat_inventory.cabin_class,
  'AVAILABLE'::seat_inventory.seat_status
FROM flight.flights AS flight
CROSS JOIN generate_series(1, 3) AS row_number
CROSS JOIN unnest(ARRAY['B', 'E']) AS column_name
ON CONFLICT (flight_id, seat_number) DO NOTHING;

COMMIT;