import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '@shared/infrastructure/persistence/postgres-database';
import { UniqueId } from '@shared/domain/model/unique-id';
import { Money } from '@shared/domain/model/money';
import { AirportCode } from '../../domain/model/airport-code';
import { Flight } from '../../domain/model/flight';
import { FlightStatus } from '../../domain/model/flight-status';
import {
  FlightRepositoryPort,
  FlightSearchCriteria,
  FlightSearchResult,
} from '../../domain/ports/flight.repository';

interface FlightRow {
  id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure_at: Date;
  arrival_at: Date;
  base_fare_cents: number;
  currency: string;
  aircraft_model: string;
  status: FlightStatus;
}

@Injectable()
export class PostgresFlightRepository implements FlightRepositoryPort {
  constructor(private readonly database: PostgresDatabase) {}

  async findById(id: UniqueId): Promise<Flight | null> {
    const result = await this.database.query<FlightRow>(
      'SELECT * FROM flight.flights WHERE id = $1',
      [id.value],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async search(criteria: FlightSearchCriteria): Promise<FlightSearchResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (condition: string, value: unknown) => {
      values.push(value);
      conditions.push(condition.replace('?', `$${values.length}`));
    };

    if (criteria.origin) add('origin = ?', criteria.origin.value);
    if (criteria.destination) add('destination = ?', criteria.destination.value);
    if (criteria.departureDate) {
      const start = new Date(criteria.departureDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      add('departure_at >= ?', start);
      add('departure_at < ?', end);
    }
    if (criteria.statuses?.length) add('status = ANY(?)', criteria.statuses);
    if (criteria.maxFareInCents !== undefined) add('base_fare_cents <= ?', criteria.maxFareInCents);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sort = criteria.sortBy === 'price' ? 'base_fare_cents ASC' : 'departure_at ASC';
    const count = await this.database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM flight.flights ${where}`,
      values,
    );
    const rows = await this.database.query<FlightRow>(
      `SELECT * FROM flight.flights ${where} ORDER BY ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, criteria.limit, criteria.offset],
    );
    return { items: rows.rows.map((row) => this.toDomain(row)), total: Number(count.rows[0].count) };
  }

  async save(flight: Flight): Promise<void> {
    await this.database.query(
      `INSERT INTO flight.flights (id, flight_number, airline, origin, destination, departure_at, arrival_at, base_fare_cents, currency, aircraft_model, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET flight_number = EXCLUDED.flight_number, airline = EXCLUDED.airline,
       origin = EXCLUDED.origin, destination = EXCLUDED.destination, departure_at = EXCLUDED.departure_at,
       arrival_at = EXCLUDED.arrival_at, base_fare_cents = EXCLUDED.base_fare_cents, currency = EXCLUDED.currency,
      aircraft_model = EXCLUDED.aircraft_model, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [
        flight.id.value,
        flight.flightNumber,
        flight.airline,
        flight.origin.value,
        flight.destination.value,
        flight.departureAt,
        flight.arrivalAt,
        flight.baseFare.amountInCents,
        flight.baseFare.currency,
        flight.aircraftModel,
        flight.status,
      ],
    );
  }

  private toDomain(row: FlightRow): Flight {
    return Flight.rehydrate({
      id: UniqueId.fromString(row.id),
      flightNumber: row.flight_number,
      airline: row.airline,
      origin: AirportCode.create(row.origin),
      destination: AirportCode.create(row.destination),
      departureAt: new Date(row.departure_at),
      arrivalAt: new Date(row.arrival_at),
      baseFare: Money.fromCents(Number(row.base_fare_cents), row.currency),
      aircraftModel: row.aircraft_model,
      status: row.status,
    });
  }
}