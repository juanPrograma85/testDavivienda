import { FlightSeatMapState } from './flight-seat-map.state';

describe('FlightSeatMapState', () => {
  let state: FlightSeatMapState;

  beforeEach(() => {
    state = new FlightSeatMapState();
    state.setSnapshot([
      { seatId: '2A', row: 2, column: 'A', cabinClass: 'ECONOMY', status: 'AVAILABLE', holdId: null, holdExpiresAt: null },
      { seatId: '2B', row: 2, column: 'B', cabinClass: 'ECONOMY', status: 'AVAILABLE', holdId: null, holdExpiresAt: null },
    ]);
  });

  it('updates only the seat targeted by realtime events', () => {
    state.applyEvent({
      eventId: 'held-1', type: 'SeatHeld', version: 1, occurredAt: '2026-09-25T00:00:00.000Z',
      flightId: 'THA001', aggregateId: '2A', payload: { seatId: '2A', status: 'HELD', holdId: 'hold-1', expiresAt: '2026-09-25T00:10:00.000Z' },
    });
    expect(state.seats()[0].status).toBe('HELD');
    expect(state.seats()[1].status).toBe('AVAILABLE');

    state.applyEvent({
      eventId: 'released-1', type: 'SeatReleased', version: 1, occurredAt: '2026-09-25T00:00:00.000Z',
      flightId: 'THA001', aggregateId: '2A', payload: { seatId: '2A', status: 'AVAILABLE', reason: 'released-by-user' },
    });
    expect(state.seats()[0].status).toBe('AVAILABLE');

    state.applyEvent({
      eventId: 'expired-1', type: 'SeatHoldExpired', version: 1, occurredAt: '2026-09-25T00:00:00.000Z',
      flightId: 'THA001', aggregateId: '2A', payload: { seatId: '2A', status: 'AVAILABLE', holdId: 'hold-1', expiresAt: '2026-09-25T00:10:00.000Z' },
    });
    state.applyEvent({
      eventId: 'occupied-1', type: 'SeatOccupied', version: 1, occurredAt: '2026-09-25T00:00:00.000Z',
      flightId: 'THA001', aggregateId: '2A', payload: { seatId: '2A', status: 'OCCUPIED', reservationId: 'reservation-1' },
    });
    expect(state.seats()[0].status).toBe('OCCUPIED');
  });
});