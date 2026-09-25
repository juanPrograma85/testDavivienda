import { Flight } from '../../domain/model/flight';
import { FlightStatus } from '../../domain/model/flight-status';

export interface FlightView {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  aircraftModel: string;
  status: FlightStatus;
  bookable: boolean;
  fare: { amount: number; currency: string };
}

export const FlightMapper = {
  toView(flight: Flight): FlightView {
    return {
      id: flight.id.value,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      origin: flight.origin.value,
      destination: flight.destination.value,
      departureAt: flight.departureAt.toISOString(),
      arrivalAt: flight.arrivalAt.toISOString(),
      durationMinutes: flight.durationMinutes,
      aircraftModel: flight.aircraftModel,
      status: flight.status,
      bookable: flight.isBookable(),
      fare: flight.baseFare.toPrimitives(),
    };
  },
};
