import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { FlightStatus } from '../../domain/model/flight-status';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
} from '../../domain/ports/flight.repository';
import { FlightMapper, FlightView } from '../mappers/flight.mapper';

export interface ChangeFlightStatusCommand {
  flightId: string;
  status: FlightStatus;
  reason?: string;
}

/**
 * Historia 1 (regla de tiempo real): el cambio de estado publica un evento que
 * los clientes suscritos por SSE reciben sin recargar la página.
 */
@Injectable()
export class ChangeFlightStatusUseCase {
  constructor(
    @Inject(FLIGHT_REPOSITORY)
    private readonly flights: FlightRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: ChangeFlightStatusCommand): Promise<FlightView> {
    const flight = await this.flights.findById(
      UniqueId.fromString(command.flightId),
    );
    if (!flight) {
      throw new NotFoundError(`Flight ${command.flightId} was not found`);
    }

    flight.changeStatus(command.status, command.reason);
    await this.flights.save(flight);
    await this.eventBus.publish(flight.pullDomainEvents());

    return FlightMapper.toView(flight);
  }
}
