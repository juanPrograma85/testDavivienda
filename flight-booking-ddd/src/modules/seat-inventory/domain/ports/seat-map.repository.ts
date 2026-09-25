import { UniqueId } from '@shared/domain/model/unique-id';
import { SeatMap } from '../model/seat-map';

export interface SeatMapRepositoryPort {
  findByFlightId(flightId: UniqueId): Promise<SeatMap | null>;
  findByHoldId(holdId: string): Promise<{ flightId: string; seatNumber: string } | null>;
  findAll(): Promise<SeatMap[]>;
  save(seatMap: SeatMap): Promise<void>;
  /**
   * Runs a mutation under an exclusive per-flight lock. Prevents two concurrent
   * requests from holding the same seat (lost update).
   */
  withLock<T>(flightId: UniqueId, mutation: () => Promise<T>): Promise<T>;
}

export const SEAT_MAP_REPOSITORY = Symbol('SeatMapRepositoryPort');
