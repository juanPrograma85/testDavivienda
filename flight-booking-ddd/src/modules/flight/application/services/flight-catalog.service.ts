import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
} from '../../domain/ports/flight.repository';

export interface FlightSummary {
  flightId: string;
  flightNumber: string;
  aircraftModel: string;
  bookable: boolean;
  fare: { amount: number; currency: string };
}

/**
 * Published language of the flight module. It is the ONLY surface other modules
 * may consume, and they do so through their own anti-corruption adapters.
 */
@Injectable()
export class FlightCatalogService {
  constructor(
    @Inject(FLIGHT_REPOSITORY)
    private readonly flights: FlightRepositoryPort,
  ) {}

  async getSummary(flightId: string): Promise<FlightSummary> {
    const flight = await this.flights.findById(UniqueId.fromString(flightId));
    if (!flight) {
      throw new NotFoundError(`Flight ${flightId} was not found`);
    }
    return {
      flightId: flight.id.value,
      flightNumber: flight.flightNumber,
      aircraftModel: flight.aircraftModel,
      bookable: flight.isBookable(),
      fare: flight.baseFare.toPrimitives(),
    };
  }

  async assertBookable(flightId: string): Promise<FlightSummary> {
    const flight = await this.flights.findById(UniqueId.fromString(flightId));
    if (!flight) {
      throw new NotFoundError(`Flight ${flightId} was not found`);
    }
    flight.assertBookable();
    return {
      flightId: flight.id.value,
      flightNumber: flight.flightNumber,
      aircraftModel: flight.aircraftModel,
      bookable: true,
      fare: flight.baseFare.toPrimitives(),
    };
  }
}
