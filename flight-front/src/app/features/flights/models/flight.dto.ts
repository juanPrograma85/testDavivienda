export interface SearchFlightsRequest {
  origin: string;
  destination: string;
  departureDate: string;
}

export interface FlightDto {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  aircraftModel: string;
  status: string;
  bookable: boolean;
  fare: FareDto;
}

export interface FareDto {
  amount: number;
  currency: string;
}

export interface FlightSearchResponse {
  items: FlightDto[];
  total: number;
  page: number;
  pageSize: number;
}