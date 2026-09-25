import { Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { Flight } from '../../domain/model/flight';
import {
  FlightRepositoryPort,
  FlightSearchCriteria,
  FlightSearchResult,
} from '../../domain/ports/flight.repository';

const MAX_PAGE_SIZE = 100;

/**
 * Reference adapter. Replacing it with Postgres/Mongo only requires a new class
 * implementing FlightRepositoryPort — no application or domain change.
 */
@Injectable()
export class InMemoryFlightRepository implements FlightRepositoryPort {
  private readonly store = new Map<string, Flight>();

  async findById(id: UniqueId): Promise<Flight | null> {
    return this.store.get(id.value) ?? null;
  }

  async search(criteria: FlightSearchCriteria): Promise<FlightSearchResult> {
    const matches = [...this.store.values()].filter((flight) =>
      this.matches(flight, criteria),
    );

    matches.sort((a, b) =>
      criteria.sortBy === 'price'
        ? a.baseFare.amount - b.baseFare.amount
        : a.departureAt.getTime() - b.departureAt.getTime(),
    );

    const limit = Math.min(Math.max(criteria.limit, 1), MAX_PAGE_SIZE);
    const offset = Math.max(criteria.offset, 0);

    return {
      items: matches.slice(offset, offset + limit),
      total: matches.length,
    };
  }

  async save(flight: Flight): Promise<void> {
    this.store.set(flight.id.value, flight);
  }

  private matches(flight: Flight, criteria: FlightSearchCriteria): boolean {
    if (criteria.origin && !flight.origin.equals(criteria.origin)) return false;
    if (criteria.destination && !flight.destination.equals(criteria.destination)) {
      return false;
    }
    if (criteria.departureDate && !this.sameUtcDay(flight.departureAt, criteria.departureDate)) {
      return false;
    }
    if (criteria.statuses?.length && !criteria.statuses.includes(flight.status)) {
      return false;
    }
    if (
      criteria.maxFare !== undefined &&
      flight.baseFare.amount > criteria.maxFare
    ) {
      return false;
    }
    return true;
  }

  private sameUtcDay(a: Date, b: Date): boolean {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  }
}
