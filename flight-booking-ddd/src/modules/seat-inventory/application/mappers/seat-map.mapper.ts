import { Seat } from '../../domain/model/seat';
import { SeatMap } from '../../domain/model/seat-map';
import { CabinClass, SeatStatus } from '../../domain/model/seat-status';
import { OccupancySnapshot } from '../../domain/events/occupancy-changed.event';

export interface SeatView {
  number: string;
  row: number;
  column: string;
  cabinClass: CabinClass;
  status: SeatStatus;
  /** Seconds left before the temporary hold expires, when applicable. */
  holdExpiresInSeconds: number | null;
}

export interface SeatMapView {
  flightId: string;
  rows: number[];
  seats: SeatView[];
  occupancy: OccupancySnapshot;
  generatedAt: string;
}

export const SeatMapMapper = {
  toSeatView(seat: Seat, now: Date): SeatView {
    const status = seat.effectiveStatus(now);
    return {
      number: seat.number.value,
      row: seat.number.row,
      column: seat.number.column,
      cabinClass: seat.cabinClass,
      status,
      holdExpiresInSeconds:
        status === SeatStatus.Held && seat.hold
          ? seat.hold.remainingSeconds(now)
          : null,
    };
  },

  toView(seatMap: SeatMap, now: Date): SeatMapView {
    const seats = seatMap
      .allSeats()
      .map((seat) => SeatMapMapper.toSeatView(seat, now));

    return {
      flightId: seatMap.flightId,
      rows: [...new Set(seats.map((seat) => seat.row))].sort((a, b) => a - b),
      seats,
      occupancy: seatMap.occupancy(now),
      generatedAt: now.toISOString(),
    };
  },
};
