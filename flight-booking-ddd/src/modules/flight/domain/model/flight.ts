import { AggregateRoot } from '@shared/domain/model/aggregate-root';
import { UniqueId } from '@shared/domain/model/unique-id';
import { Money } from '@shared/domain/model/money';
import {
  BusinessRuleViolationError,
  InvalidArgumentError,
} from '@shared/domain/errors/domain-error';
import { AirportCode } from './airport-code';
import { FlightStatus, FlightStatusPolicy } from './flight-status';
import { FlightStatusChangedEvent } from '../events/flight-status-changed.event';

export interface FlightProps {
  id: UniqueId;
  flightNumber: string;
  airline: string;
  origin: AirportCode;
  destination: AirportCode;
  departureAt: Date;
  arrivalAt: Date;
  baseFare: Money;
  aircraftModel: string;
  status: FlightStatus;
}

const FLIGHT_NUMBER_PATTERN = /^[A-Z0-9]{2}\d{1,4}$/;

export class Flight extends AggregateRoot<UniqueId> {
  private _status: FlightStatus;

  private constructor(private readonly props: FlightProps) {
    super(props.id);
    this._status = props.status;
  }

  static create(props: FlightProps): Flight {
    Flight.assertInvariants(props);
    return new Flight({ ...props });
  }

  static rehydrate(props: FlightProps): Flight {
    return Flight.create(props);
  }

  private static assertInvariants(props: FlightProps): void {
    if (!FLIGHT_NUMBER_PATTERN.test(props.flightNumber)) {
      throw new InvalidArgumentError(
        `"${props.flightNumber}" is not a valid flight number`,
      );
    }
    if (props.origin.equals(props.destination)) {
      throw new InvalidArgumentError(
        'Origin and destination airports must differ',
      );
    }
    if (props.arrivalAt.getTime() <= props.departureAt.getTime()) {
      throw new InvalidArgumentError(
        'Arrival time must be later than departure time',
      );
    }
  }

  get flightNumber(): string {
    return this.props.flightNumber;
  }

  get airline(): string {
    return this.props.airline;
  }

  get origin(): AirportCode {
    return this.props.origin;
  }

  get destination(): AirportCode {
    return this.props.destination;
  }

  get departureAt(): Date {
    return new Date(this.props.departureAt);
  }

  get arrivalAt(): Date {
    return new Date(this.props.arrivalAt);
  }

  get baseFare(): Money {
    return this.props.baseFare;
  }

  get aircraftModel(): string {
    return this.props.aircraftModel;
  }

  get status(): FlightStatus {
    return this._status;
  }

  get durationMinutes(): number {
    return Math.round(
      (this.props.arrivalAt.getTime() - this.props.departureAt.getTime()) /
        60_000,
    );
  }

  isBookable(): boolean {
    return FlightStatusPolicy.isBookable(this._status);
  }

  assertBookable(): void {
    if (!this.isBookable()) {
      throw new BusinessRuleViolationError(
        `Flight ${this.props.flightNumber} is not accepting reservations (status ${this._status})`,
      );
    }
  }

  changeStatus(next: FlightStatus, reason?: string): void {
    FlightStatusPolicy.assertTransitionAllowed(this._status, next);
    const previous = this._status;
    this._status = next;
    this.record(
      new FlightStatusChangedEvent(
        this.id.value,
        this.props.flightNumber,
        previous,
        next,
        reason,
      ),
    );
  }

  /** Driven by seat-inventory events when the last seat is taken or freed. */
  syncAvailability(hasAvailableSeats: boolean): void {
    if (FlightStatusPolicy.isTerminal(this._status)) return;

    if (!hasAvailableSeats && this._status !== FlightStatus.SoldOut) {
      this.changeStatus(FlightStatus.SoldOut, 'No seats left');
      return;
    }
    if (hasAvailableSeats && this._status === FlightStatus.SoldOut) {
      const previous = this._status;
      this._status = FlightStatus.Scheduled;
      this.record(
        new FlightStatusChangedEvent(
          this.id.value,
          this.props.flightNumber,
          previous,
          this._status,
          'Seats released',
        ),
      );
    }
  }
}
