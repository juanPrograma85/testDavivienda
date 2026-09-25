import { AggregateRoot } from '@shared/domain/model/aggregate-root';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import { CabinLayout } from './cabin-layout';
import { Seat, SeatHold } from './seat';
import { SeatNumber } from './seat-number';
import { SeatReleaseReason, SeatStatus } from './seat-status';
import {
  SeatHeldEvent,
  SeatHoldExpiredEvent,
  SeatOccupiedEvent,
  SeatReleasedEvent,
} from '../events/seat.events';
import {
  OccupancyChangedEvent,
  OccupancySnapshot,
} from '../events/occupancy-changed.event';

/**
 * Aggregate root keyed by flight id. Every seat transition happens here, which
 * makes the "one holder per seat" invariant enforceable in a single place.
 */
export class SeatMap extends AggregateRoot<UniqueId> {
  private constructor(
    flightId: UniqueId,
    private readonly seats: Map<string, Seat>,
  ) {
    super(flightId);
  }

  static forFlight(flightId: UniqueId, layout: CabinLayout): SeatMap {
    const seats = new Map<string, Seat>();
    for (const section of layout.sections) {
      for (let row = section.firstRow; row <= section.lastRow; row++) {
        for (const column of section.columns) {
          const number = SeatNumber.create(`${row}${column}`);
          seats.set(
            number.value,
            Seat.create({
              number,
              cabinClass: section.cabinClass,
              status: SeatStatus.Available,
            }),
          );
        }
      }
    }
    return new SeatMap(flightId, seats);
  }

  static rehydrate(flightId: UniqueId, seats: Seat[]): SeatMap {
    return new SeatMap(
      flightId,
      new Map(seats.map((seat) => [seat.number.value, seat])),
    );
  }

  get flightId(): string {
    return this.id.value;
  }

  allSeats(): Seat[] {
    return [...this.seats.values()];
  }

  seatOrFail(seatNumber: SeatNumber): Seat {
    const seat = this.seats.get(seatNumber.value);
    if (!seat) {
      throw new NotFoundError(
        `Seat ${seatNumber.value} does not exist on flight ${this.flightId}`,
      );
    }
    return seat;
  }

  holdSeat(
    seatNumber: SeatNumber,
    userName: string,
    userDocument: string,
    ttlSeconds: number,
    now: Date,
  ): SeatHold {
    this.expireHolds(now);
    const seat = this.seatOrFail(seatNumber);
    const hold = seat.placeHold(userName, userDocument, ttlSeconds, now);

    this.record(
      new SeatHeldEvent(
        this.flightId,
        seatNumber.value,
        hold.holdId,
        hold.expiresAt,
      ),
    );
    this.recordOccupancy(now, SeatHeldEvent.NAME);
    return hold;
  }

  /** User releases require the matching document; trusted internal releases may omit it. */
  releaseSeat(
    seatNumber: SeatNumber,
    userDocument: string | undefined,
    reason: SeatReleaseReason,
    now: Date,
  ): void {
    const seat = this.seatOrFail(seatNumber);
    if (seat.status !== SeatStatus.Held) {
      return;
    }
    if (userDocument && seat.hold && seat.hold.userDocument !== userDocument) {
      throw new NotFoundError(
        `No active hold owned by the requester on seat ${seatNumber.value}`,
      );
    }
    seat.release();
    this.record(new SeatReleasedEvent(this.flightId, seatNumber.value, reason));
    this.recordOccupancy(now, SeatReleasedEvent.NAME);
  }

  occupySeat(
    seatNumber: SeatNumber,
    holdId: string,
    reservationId: string,
    now: Date,
  ): void {
    const seat = this.seatOrFail(seatNumber);
    seat.occupy(holdId, reservationId, now);
    this.record(
      new SeatOccupiedEvent(this.flightId, seatNumber.value, reservationId),
    );
    this.recordOccupancy(now, SeatOccupiedEvent.NAME);
  }

  expireHolds(now: Date): number {
    let expired = 0;
    for (const seat of this.seats.values()) {
      const expiredHold = seat.hold;
      if (seat.expireHoldIfNeeded(now)) {
        expired++;
        this.record(
          new SeatHoldExpiredEvent(
            this.flightId,
            seat.number.value,
            expiredHold!.holdId,
            expiredHold!.expiresAt,
          ),
        );
      }
    }
    if (expired > 0) {
      this.recordOccupancy(now, SeatReleasedEvent.NAME);
    }
    return expired;
  }

  occupancy(now: Date): OccupancySnapshot {
    let available = 0;
    let held = 0;
    let occupied = 0;
    let blocked = 0;

    for (const seat of this.seats.values()) {
      switch (seat.effectiveStatus(now)) {
        case SeatStatus.Available:
          available++;
          break;
        case SeatStatus.Held:
          held++;
          break;
        case SeatStatus.Occupied:
          occupied++;
          break;
        default:
          blocked++;
      }
    }

    const total = this.seats.size;
    return {
      totalSeats: total,
      availableSeats: available,
      heldSeats: held,
      occupiedSeats: occupied,
      blockedSeats: blocked,
      occupancyRate: total === 0 ? 0 : Number((occupied / total).toFixed(4)),
    };
  }

  private recordOccupancy(now: Date, trigger: string): void {
    this.record(
      new OccupancyChangedEvent(this.flightId, this.occupancy(now), trigger),
    );
  }
}
