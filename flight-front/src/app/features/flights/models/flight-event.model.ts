import { SseEvent } from '../../../core/models/sse-event.model';

export interface SeatHeldPayload {
  seatId: string;
  status: 'HELD';
  holdId: string;
  expiresAt: string;
}

export interface SeatReleasedPayload {
  seatId: string;
  status: 'AVAILABLE';
  reason: string;
}

export interface SeatHoldExpiredPayload {
  seatId: string;
  status: 'AVAILABLE';
  holdId: string;
  expiresAt: string;
}

export interface SeatOccupiedPayload {
  seatId: string;
  status: 'OCCUPIED';
  reservationId: string;
}

export type SeatHeldEvent = SseEvent<SeatHeldPayload> & { type: 'SeatHeld' };
export type SeatReleasedEvent = SseEvent<SeatReleasedPayload> & { type: 'SeatReleased' };
export type SeatHoldExpiredEvent = SseEvent<SeatHoldExpiredPayload> & { type: 'SeatHoldExpired' };
export type SeatOccupiedEvent = SseEvent<SeatOccupiedPayload> & { type: 'SeatOccupied' };

export type FlightRealtimeEvent =
  | SeatHeldEvent
  | SeatReleasedEvent
  | SeatHoldExpiredEvent
  | SeatOccupiedEvent;

export const FLIGHT_EVENT_TYPES = ['SeatHeld', 'SeatReleased', 'SeatHoldExpired', 'SeatOccupied'] as const;