import { DomainEvent } from '@shared/domain/events/domain-event';

export interface OccupancySnapshot {
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  occupiedSeats: number;
  blockedSeats: number;
  occupancyRate: number;
}

/**
 * Historia 4: cada bloqueo, liberación por expiración o reserva confirmada emite
 * este evento para que el dashboard reaccione al instante.
 */
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
