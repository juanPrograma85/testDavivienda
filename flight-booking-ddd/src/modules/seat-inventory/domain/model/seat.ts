import { randomUUID } from 'node:crypto';
import {
  BusinessRuleViolationError,
  InvalidArgumentError,
} from '@shared/domain/errors/domain-error';
import { SeatNumber } from './seat-number';
import { CabinClass, SeatStatus } from './seat-status';

export class SeatHold {
  private constructor(
    readonly holdId: string,
    readonly userName: string,
    readonly userDocument: string,
    readonly expiresAt: Date,
  ) {}

  static open(
    userName: string,
    userDocument: string,
    ttlSeconds: number,
    now: Date,
  ): SeatHold {
    const normalizedUserName = userName?.trim();
    if (!normalizedUserName || normalizedUserName.length > 120) {
      throw new InvalidArgumentError('userName must be 1-120 characters long');
    }
    if (!/^\d{5,20}$/.test(userDocument)) {
      throw new InvalidArgumentError(
        'userDocument must contain between 5 and 20 digits',
      );
    }
    if (ttlSeconds < 60 || ttlSeconds > 600) {
      throw new InvalidArgumentError(
        'Seat hold TTL must be between 60 and 600 seconds',
      );
    }
    return new SeatHold(
      randomUUID(),
      normalizedUserName,
      userDocument,
      new Date(now.getTime() + ttlSeconds * 1000),
    );
  }

  static rehydrate(
    holdId: string,
    userName: string,
    userDocument: string,
    expiresAt: Date,
  ): SeatHold {
    return new SeatHold(holdId, userName, userDocument, expiresAt);
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  remainingSeconds(now: Date): number {
    return Math.max(
      0,
      Math.ceil((this.expiresAt.getTime() - now.getTime()) / 1000),
    );
  }
}

export interface SeatProps {
  number: SeatNumber;
  cabinClass: CabinClass;
  status: SeatStatus;
  hold?: SeatHold;
  reservationId?: string;
}

/**
 * Seat is an entity inside the SeatMap aggregate. It is never persisted or
 * mutated outside its aggregate root, which guarantees concurrency invariants.
 */
export class Seat {
  private constructor(
    readonly number: SeatNumber,
    readonly cabinClass: CabinClass,
    private _status: SeatStatus,
    private _hold?: SeatHold,
    private _reservationId?: string,
  ) {}

  static create(props: SeatProps): Seat {
    return new Seat(
      props.number,
      props.cabinClass,
      props.status,
      props.hold,
      props.reservationId,
    );
  }

  get status(): SeatStatus {
    return this._status;
  }

  get hold(): SeatHold | undefined {
    return this._hold;
  }

  get reservationId(): string | undefined {
    return this._reservationId;
  }

  effectiveStatus(now: Date): SeatStatus {
    if (this._status === SeatStatus.Held && this._hold?.isExpired(now)) {
      return SeatStatus.Available;
    }
    return this._status;
  }

  isSelectable(now: Date): boolean {
    return this.effectiveStatus(now) === SeatStatus.Available;
  }

  placeHold(
    userName: string,
    userDocument: string,
    ttlSeconds: number,
    now: Date,
  ): SeatHold {
    if (!this.isSelectable(now)) {
      throw new BusinessRuleViolationError(
        `Seat ${this.number.value} is not available (status ${this.effectiveStatus(now)})`,
      );
    }
    const hold = SeatHold.open(userName, userDocument, ttlSeconds, now);
    this._status = SeatStatus.Held;
    this._hold = hold;
    return hold;
  }

  release(): void {
    if (this._status === SeatStatus.Occupied) {
      throw new BusinessRuleViolationError(
        `Seat ${this.number.value} is permanently occupied and cannot be released`,
      );
    }
    this._status = SeatStatus.Available;
    this._hold = undefined;
  }

  occupy(holdId: string, reservationId: string, now: Date): void {
    if (this._status !== SeatStatus.Held) {
      throw new BusinessRuleViolationError(
        `Seat ${this.number.value} must be held before being confirmed`,
      );
    }
    if (!this._hold || this._hold.holdId !== holdId) {
      throw new BusinessRuleViolationError(
        `Hold does not match the current lock on seat ${this.number.value}`,
      );
    }
    if (this._hold.isExpired(now)) {
      throw new BusinessRuleViolationError(
        `The hold on seat ${this.number.value} has expired`,
      );
    }
    this._status = SeatStatus.Occupied;
    this._reservationId = reservationId;
    this._hold = undefined;
  }

  expireHoldIfNeeded(now: Date): boolean {
    if (this._status === SeatStatus.Held && this._hold?.isExpired(now)) {
      this._status = SeatStatus.Available;
      this._hold = undefined;
      return true;
    }
    return false;
  }
}
