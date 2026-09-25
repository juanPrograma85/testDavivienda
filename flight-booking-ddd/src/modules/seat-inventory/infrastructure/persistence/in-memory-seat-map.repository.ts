import { Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { SeatMap } from '../../domain/model/seat-map';
import { SeatMapRepositoryPort } from '../../domain/ports/seat-map.repository';

@Injectable()
export class InMemorySeatMapRepository implements SeatMapRepositoryPort {
  private readonly store = new Map<string, SeatMap>();
  /** One serialized promise chain per flight acts as an in-process mutex. */
  private readonly locks = new Map<string, Promise<unknown>>();

  async findByFlightId(flightId: UniqueId): Promise<SeatMap | null> {
    return this.store.get(flightId.value) ?? null;
  }

  async findAll(): Promise<SeatMap[]> {
    return [...this.store.values()];
  }

  async save(seatMap: SeatMap): Promise<void> {
    this.store.set(seatMap.flightId, seatMap);
  }

  async withLock<T>(flightId: UniqueId, mutation: () => Promise<T>): Promise<T> {
    const key = flightId.value;
    const previous = this.locks.get(key) ?? Promise.resolve();
    const current = previous.then(mutation, mutation);
    const tail = current.then(
      () => undefined,
      () => undefined,
    );

    this.locks.set(key, tail);

    try {
      return await current;
    } finally {
      if (this.locks.get(key) === tail) {
        this.locks.delete(key);
      }
    }
  }
}
