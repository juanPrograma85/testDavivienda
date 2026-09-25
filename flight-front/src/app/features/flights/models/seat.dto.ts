export interface SeatDto {
  seatId: string;
  row: number;
  column: string;
  cabinClass: string;
  status: 'AVAILABLE' | 'HELD' | 'OCCUPIED';
  holdId: string | null;
  holdExpiresAt: string | null;
}

export interface SeatMapResponse {
  flightId: string;
  occupancy?: {
    availableSeats: number;
    heldSeats: number;
    occupiedSeats: number;
  };
  seats: SeatDto[];
}

export interface HoldSeatResponse {
  holdId: string;
  flightId: string;
  seatId: string;
  expiresAt: string;
  expiresInSeconds: number;
}