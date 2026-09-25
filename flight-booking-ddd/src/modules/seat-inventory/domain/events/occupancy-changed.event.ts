import { DomainEvent } from '@shared/domain/events/domain-event';

export interface OccupancySnapshot {
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  occupiedSeats: number;
  blockedSeats: number;
  occupancyRate: number;
}

/** Keeps the dashboard current after holds, expirations, and confirmations. */
export class OccupancyChangedEvent extends DomainEvent {
  static readonly NAME = 'seat-inventory.occupancy-changed';

  constructor(
    flightId: string,
    readonly snapshot: OccupancySnapshot,
    readonly trigger: string,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return OccupancyChangedEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      trigger: this.trigger,
      ...this.snapshot,
    };
  }
}
