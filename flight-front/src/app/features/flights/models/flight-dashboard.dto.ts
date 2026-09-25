export interface FlightDashboardDto {
  flightId: string;
  generatedAt: string;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  occupiedSeats: number;
  blockedSeats: number;
  occupancyRate: number;
}