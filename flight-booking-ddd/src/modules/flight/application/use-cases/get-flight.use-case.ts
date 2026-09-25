import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
} from '../../domain/ports/flight.repository';
import { FlightMapper, FlightView } from '../mappers/flight.mapper';

@Injectable()
export class GetFlightUseCase {
  constructor(
    @Inject(FLIGHT_REPOSITORY)
    private readonly flights: FlightRepositoryPort,
  ) {}

  async execute(flightId: string): Promise<FlightView> {
    const flight = await this.flights.findById(UniqueId.fromString(flightId));
    if (!flight) {
      throw new NotFoundError(`Flight ${flightId} was not found`);
    }
    return FlightMapper.toView(flight);
  }
}
