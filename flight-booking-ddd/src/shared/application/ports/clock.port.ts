/** Time is an explicit dependency so expiry rules stay deterministic and testable. */
export interface ClockPort {
  now(): Date;
}

export const CLOCK = Symbol('ClockPort');
