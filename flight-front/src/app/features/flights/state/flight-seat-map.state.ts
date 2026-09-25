import { Injectable, signal } from '@angular/core';
import { FlightRealtimeEvent } from '../models/flight-event.model';
import { SeatDto } from '../models/seat.dto';

@Injectable()
export class FlightSeatMapState {
  readonly seats = signal<SeatDto[]>([]);

  setSnapshot(seats: SeatDto[]): void {
    this.seats.set(seats);
  }

  applyEvent(event: FlightRealtimeEvent): void {
    const seatId = event.payload.seatId;
    this.seats.update((seats) => seats.map((seat) => {
      if (seat.seatId !== seatId) {
        return seat;
      }

      if (event.type === 'SeatHeld') {
        return { ...seat, status: 'HELD', holdId: event.payload.holdId, holdExpiresAt: event.payload.expiresAt };
      }

      if (event.type === 'SeatOccupied') {
        return { ...seat, status: 'OCCUPIED', holdId: null, holdExpiresAt: null };
      }

      return { ...seat, status: 'AVAILABLE', holdId: null, holdExpiresAt: null };
    }));
  }
}