import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '@shared/infrastructure/persistence/postgres-database';
import { UniqueId } from '@shared/domain/model/unique-id';
import { SeatMap } from '../../domain/model/seat-map';
import { Seat, SeatHold } from '../../domain/model/seat';
import { SeatNumber } from '../../domain/model/seat-number';
import { CabinClass, SeatStatus } from '../../domain/model/seat-status';
import { SeatMapRepositoryPort } from '../../domain/ports/seat-map.repository';

interface SeatRow {
  flight_id: string;
  seat_number: string;
  cabin_class: CabinClass;
  status: SeatStatus;
  hold_id: string | null;
  user_name: string | null;
  user_document: string | null;
  hold_expires_at: Date | null;
  reservation_id: string | null;
}

@Injectable()
export class PostgresSeatMapRepository implements SeatMapRepositoryPort {
  constructor(private readonly database: PostgresDatabase) {}

  async findByFlightId(flightId: UniqueId): Promise<SeatMap | null> {
    const result = await this.database.query<SeatRow>(
      'SELECT * FROM seat_inventory.seats WHERE flight_id = $1 ORDER BY seat_number',
      [flightId.value],
    );
    if (!result.rows.length) return null;
    return SeatMap.rehydrate(flightId, result.rows.map((row) => this.toDomain(row)));
  }

  async findByHoldId(holdId: string): Promise<{ flightId: string; seatNumber: string } | null> {
    const result = await this.database.query<{ flight_id: string; seat_number: string }>(
      'SELECT flight_id, seat_number FROM seat_inventory.seats WHERE hold_id = $1',
      [holdId],
    );
    const seat = result.rows[0];
    return seat ? { flightId: seat.flight_id, seatNumber: seat.seat_number } : null;
  }

  async findAll(): Promise<SeatMap[]> {
    const result = await this.database.query<{ flight_id: string }>(
      'SELECT DISTINCT flight_id FROM seat_inventory.seats ORDER BY flight_id',
    );
    const maps: SeatMap[] = [];
    for (const row of result.rows) {
      const map = await this.findByFlightId(UniqueId.fromString(row.flight_id));
      if (map) maps.push(map);
    }
    return maps;
  }

  async save(seatMap: SeatMap): Promise<void> {
    for (const seat of seatMap.allSeats()) {
      await this.database.query(
        `INSERT INTO seat_inventory.seats (flight_id, seat_number, cabin_class, status, hold_id, user_name, user_document, hold_expires_at, reservation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (flight_id, seat_number) DO UPDATE SET cabin_class = EXCLUDED.cabin_class,
         status = EXCLUDED.status, hold_id = EXCLUDED.hold_id, user_name = EXCLUDED.user_name,
         user_document = EXCLUDED.user_document, hold_expires_at = EXCLUDED.hold_expires_at,
         reservation_id = EXCLUDED.reservation_id,
         updated_at = CURRENT_TIMESTAMP`,
        [
          seatMap.flightId,
          seat.number.value,
          seat.cabinClass,
          seat.status,
          seat.hold?.holdId ?? null,
          seat.hold?.userName ?? null,
          seat.hold?.userDocument ?? null,
          seat.hold?.expiresAt ?? null,
          seat.reservationId ?? null,
        ],
      );
    }
  }

  async withLock<T>(flightId: UniqueId, mutation: () => Promise<T>): Promise<T> {
    return this.database.withTransaction(async () => {
      await this.database.query('SELECT pg_advisory_xact_lock(hashtext($1))', [flightId.value]);
      return mutation();
    });
  }

  private toDomain(row: SeatRow): Seat {
    const hold = row.hold_id && row.user_name && row.user_document && row.hold_expires_at
      ? SeatHold.rehydrate(
          row.hold_id,
          row.user_name,
          row.user_document,
          new Date(row.hold_expires_at),
        )
      : undefined;
    return Seat.create({
      number: SeatNumber.create(row.seat_number),
      cabinClass: row.cabin_class,
      status: row.status,
      hold,
      reservationId: row.reservation_id ?? undefined,
    });
  }
}