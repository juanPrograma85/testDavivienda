import { BusinessRuleViolationError } from '@shared/domain/errors/domain-error';

export enum FlightStatus {
  Scheduled = 'SCHEDULED',
  Delayed = 'DELAYED',
  Boarding = 'BOARDING',
  SoldOut = 'SOLD_OUT',
  Departed = 'DEPARTED',
  Cancelled = 'CANCELLED',
}

/** Terminal states cannot transition any further. */
const TERMINAL_STATES: ReadonlySet<FlightStatus> = new Set([
  FlightStatus.Cancelled,
  FlightStatus.Departed,
]);

/** States that still accept new reservations. */
const BOOKABLE_STATES: ReadonlySet<FlightStatus> = new Set([
  FlightStatus.Scheduled,
  FlightStatus.Delayed,
  FlightStatus.Boarding,
]);

export const FlightStatusPolicy = {
  isTerminal(status: FlightStatus): boolean {
    return TERMINAL_STATES.has(status);
  },

  isBookable(status: FlightStatus): boolean {
    return BOOKABLE_STATES.has(status);
  },

  assertTransitionAllowed(from: FlightStatus, to: FlightStatus): void {
    if (from === to) {
      throw new BusinessRuleViolationError(
        `Flight is already in status ${from}`,
      );
    }
    if (TERMINAL_STATES.has(from)) {
      throw new BusinessRuleViolationError(
        `Flight in terminal status ${from} cannot transition to ${to}`,
      );
    }
  },
};
