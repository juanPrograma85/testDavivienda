CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS flight;
CREATE SCHEMA IF NOT EXISTS seat_inventory;
CREATE SCHEMA IF NOT EXISTS reservation;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TYPE flight.flight_status AS ENUM (
  'SCHEDULED', 'DELAYED', 'BOARDING', 'SOLD_OUT', 'DEPARTED', 'CANCELLED'
);

CREATE TYPE seat_inventory.seat_status AS ENUM (
  'AVAILABLE', 'HELD', 'OCCUPIED', 'BLOCKED'
);

CREATE TYPE seat_inventory.cabin_class AS ENUM (
  'ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'
);

CREATE TYPE seat_inventory.release_reason AS ENUM (
  'RELEASED_BY_USER', 'HOLD_EXPIRED', 'RESERVATION_CANCELLED', 'SYSTEM_RELEASED'
);

CREATE TYPE reservation.reservation_status AS ENUM (
  'PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'
);

CREATE TYPE payment.payment_status AS ENUM (
  'PENDING', 'AUTHORIZED', 'DECLINED', 'REFUNDED'
);

CREATE TABLE flight.flights (
  id VARCHAR(12) PRIMARY KEY,
  flight_number VARCHAR(20) NOT NULL,
  airline VARCHAR(120) NOT NULL,
  origin CHAR(3) NOT NULL,
  destination CHAR(3) NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  base_fare_cents INTEGER NOT NULL CHECK (base_fare_cents >= 0),
  currency CHAR(3) NOT NULL,
  aircraft_model VARCHAR(120) NOT NULL,
  status flight.flight_status NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_flight_number_departure UNIQUE (flight_number, departure_at),
  CONSTRAINT chk_flight_origin_destination CHECK (origin <> destination),
  CONSTRAINT chk_flight_times CHECK (arrival_at > departure_at),
  CONSTRAINT chk_iata_origin CHECK (origin ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_iata_destination CHECK (destination ~ '^[A-Z]{3}$')
);

CREATE INDEX flights_search_idx
  ON flight.flights (origin, destination, departure_at);

CREATE TABLE seat_inventory.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id VARCHAR(12) NOT NULL REFERENCES flight.flights(id),
  seat_number VARCHAR(5) NOT NULL,
  cabin_class seat_inventory.cabin_class NOT NULL,
  status seat_inventory.seat_status NOT NULL DEFAULT 'AVAILABLE',
  hold_id UUID UNIQUE,
  holder_id VARCHAR(255),
  hold_expires_at TIMESTAMPTZ,
  reservation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_flight_seat UNIQUE (flight_id, seat_number),
  CONSTRAINT uq_seat_id_flight UNIQUE (id, flight_id),
  CONSTRAINT chk_seat_hold_consistency CHECK (
    (status = 'HELD' AND hold_id IS NOT NULL AND holder_id IS NOT NULL AND hold_expires_at IS NOT NULL)
    OR
    (status <> 'HELD' AND hold_id IS NULL AND holder_id IS NULL AND hold_expires_at IS NULL)
  ),
  CONSTRAINT chk_occupied_requires_reservation CHECK (
    status <> 'OCCUPIED' OR reservation_id IS NOT NULL
  )
);

CREATE INDEX seats_expiration_idx
  ON seat_inventory.seats (hold_expires_at) WHERE status = 'HELD';

CREATE TABLE reservation.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  flight_id VARCHAR(12) NOT NULL REFERENCES flight.flights(id),
  seat_id UUID NOT NULL,
  hold_id UUID NOT NULL UNIQUE,
  passenger_id VARCHAR(255) NOT NULL,
  operation_id UUID NOT NULL UNIQUE,
  status reservation.reservation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_flight_seat
    FOREIGN KEY (seat_id, flight_id)
    REFERENCES seat_inventory.seats(id, flight_id)
);

CREATE TABLE payment.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE,
  operation_id UUID UNIQUE,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents > 0),
  currency CHAR(3) NOT NULL DEFAULT 'COP',
  status payment.payment_status NOT NULL DEFAULT 'PENDING',
  gateway_reference VARCHAR(255),
  card_brand VARCHAR(32) NOT NULL,
  card_last4 CHAR(4) NOT NULL,
  card_expiry_month SMALLINT NOT NULL CHECK (card_expiry_month BETWEEN 1 AND 12),
  card_expiry_year SMALLINT NOT NULL,
  card_holder_name VARCHAR(160) NOT NULL,
  authorization_code VARCHAR(128),
  failure_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
