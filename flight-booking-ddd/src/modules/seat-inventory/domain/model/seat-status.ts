export enum SeatStatus {
  Available = 'AVAILABLE',
  Held = 'HELD',
  Occupied = 'OCCUPIED',
  Blocked = 'BLOCKED',
}

export enum CabinClass {
  Economy = 'ECONOMY',
  PremiumEconomy = 'PREMIUM_ECONOMY',
  Business = 'BUSINESS',
}

export const CABIN_FARE_MULTIPLIER: Readonly<Record<CabinClass, number>> = {
  [CabinClass.Economy]: 1,
  [CabinClass.PremiumEconomy]: 1.45,
  [CabinClass.Business]: 2.3,
};

export enum SeatReleaseReason {
  HoldExpired = 'HOLD_EXPIRED',
  ReleasedByUser = 'RELEASED_BY_USER',
  ReservationCancelled = 'RESERVATION_CANCELLED',
}
