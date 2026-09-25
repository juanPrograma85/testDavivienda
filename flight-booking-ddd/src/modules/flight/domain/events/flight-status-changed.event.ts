import { DomainEvent } from '@shared/domain/events/domain-event';
import { FlightStatus } from '../model/flight-status';

export class FlightStatusChangedEvent extends DomainEvent {
  static readonly NAME = 'flight.status-changed';

  constructor(
    flightId: string,
    readonly flightNumber: string,
    readonly previousStatus: FlightStatus,
    readonly currentStatus: FlightStatus,
    readonly reason?: string,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return FlightStatusChangedEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      flightNumber: this.flightNumber,
      previousStatus: this.previousStatus,
      currentStatus: this.currentStatus,
      reason: this.reason ?? null,
    };
  }
}
