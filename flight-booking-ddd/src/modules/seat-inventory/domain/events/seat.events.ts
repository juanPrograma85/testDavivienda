import { DomainEvent } from '@shared/domain/events/domain-event';
import { SeatReleaseReason } from '../model/seat-status';

export class SeatHeldEvent extends DomainEvent {
  static readonly NAME = 'seat.held';

  constructor(
    flightId: string,
    readonly seatNumber: string,
    readonly holdId: string,
    readonly expiresAt: Date,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return SeatHeldEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      seatNumber: this.seatNumber,
      holdId: this.holdId,
      expiresAt: this.expiresAt.toISOString(),
      status: 'HELD',
    };
  }
}

export class SeatReleasedEvent extends DomainEvent {
  static readonly NAME = 'seat.released';

  constructor(
    flightId: string,
    readonly seatNumber: string,
    readonly reason: SeatReleaseReason,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return SeatReleasedEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      seatNumber: this.seatNumber,
      reason: this.reason,
      status: 'AVAILABLE',
    };
  }
}

export class SeatHoldExpiredEvent extends DomainEvent {
  static readonly NAME = 'seat.hold-expired';

  constructor(
    flightId: string,
    readonly seatNumber: string,
    readonly holdId: string,
    readonly expiresAt: Date,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return SeatHoldExpiredEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      seatNumber: this.seatNumber,
      holdId: this.holdId,
      expiresAt: this.expiresAt.toISOString(),
      status: 'AVAILABLE',
    };
  }
}

export class SeatOccupiedEvent extends DomainEvent {
  static readonly NAME = 'seat.occupied';

  constructor(
    flightId: string,
    readonly seatNumber: string,
    readonly reservationId: string,
  ) {
    super(flightId);
  }

  get eventName(): string {
    return SeatOccupiedEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      flightId: this.aggregateId,
      seatNumber: this.seatNumber,
      reservationId: this.reservationId,
      status: 'OCCUPIED',
    };
  }
}
