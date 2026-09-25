-- Development/demo data. This file is mounted by the local Docker Compose only.
-- It is idempotent and never overwrites existing business state.

INSERT INTO flight.flights (
  id, flight_number, airline, origin, destination, departure_at, arrival_at,
  base_fare, currency, aircraft_model, status
)
VALUES
  ('THA001', 'AV245', 'Avianca', 'BOG', 'MEX', CURRENT_DATE + INTERVAL '1 day 12 hours', CURRENT_DATE + INTERVAL '1 day 16 hours 50 minutes', 42050, 'COP', 'Airbus A320', 'SCHEDULED'),
  ('MAD264', 'AM671', 'Aeromexico', 'BOG', 'MEX', CURRENT_DATE + INTERVAL '1 day 19 hours', CURRENT_DATE + INTERVAL '2 days', 38990, 'COP', 'Boeing 737-800', 'SCHEDULED'),
  ('AV453', 'LA502', 'LATAM', 'MEX', 'BOG', CURRENT_DATE + INTERVAL '2 days 9 hours', CURRENT_DATE + INTERVAL '2 days 13 hours 45 minutes', 45500, 'COP', 'Airbus A319', 'SCHEDULED'),
  ('IBE586', 'IB6586', 'Iberia', 'BOG', 'MAD', CURRENT_DATE + INTERVAL '3 days 22 hours', CURRENT_DATE + INTERVAL '4 days 7 hours 45 minutes', 91075, 'COP', 'Airbus A350', 'SCHEDULED'),
  ('CMP312', 'CM312', 'Copa', 'PTY', 'BOG', CURRENT_DATE + INTERVAL '1 day 15 hours', CURRENT_DATE + INTERVAL '1 day 16 hours 35 minutes', 18000, 'COP', 'Boeing 737-700', 'SCHEDULED')
ON CONFLICT (id) DO NOTHING;

WITH cabin_layout AS (
  SELECT row_number, column_name, cabin_class
  FROM generate_series(1, 3) AS row_number
  CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS column_name
  CROSS JOIN LATERAL (SELECT 'BUSINESS'::seat_inventory.cabin_class) AS class(cabin_class)

  UNION ALL

  SELECT row_number, column_name, cabin_class
  FROM generate_series(4, 8) AS row_number
  CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS column_name
  CROSS JOIN LATERAL (SELECT 'PREMIUM_ECONOMY'::seat_inventory.cabin_class) AS class(cabin_class)

  UNION ALL

  SELECT row_number, column_name, cabin_class
  FROM generate_series(9, 30) AS row_number
  CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS column_name
  CROSS JOIN LATERAL (SELECT 'ECONOMY'::seat_inventory.cabin_class) AS class(cabin_class)
)
INSERT INTO seat_inventory.seats (
  flight_id, seat_number, cabin_class, status
)
SELECT
  flight.id,
  cabin.row_number::text || cabin.column_name,
  cabin.cabin_class,
  'AVAILABLE'::seat_inventory.seat_status
FROM flight.flights AS flight
CROSS JOIN cabin_layout AS cabin
WHERE flight.id IN ('THA001', 'MAD264', 'AV453', 'IBE586', 'CMP312')
ON CONFLICT (flight_id, seat_number) DO NOTHING;
