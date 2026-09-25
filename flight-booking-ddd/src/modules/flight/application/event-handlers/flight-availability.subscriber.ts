import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { DomainEvent } from '@shared/domain/events/domain-event';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
} from '../../domain/ports/flight.repository';

/**
 * Anti-corruption subscriber: reacts to seat-inventory occupancy facts using only
 * their serialized shape, so the flight module never imports seat-inventory code.
 */
const OCCUPANCY_EVENT = 'seat-inventory.occupancy-changed';

interface OccupancyPayload {
  flightId?: unknown;
  availableSeats?: unknown;
}

@Injectable()
export class FlightAvailabilitySubscriber implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(FLIGHT_REPOSITORY)
    private readonly flights: FlightRepositoryPort,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(OCCUPANCY_EVENT, (event) => this.handle(event));
  }

  private async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPrimitives() as OccupancyPayload;
    if (
      typeof payload.flightId !== 'string' ||
      typeof payload.availableSeats !== 'number'
    ) {
      return;
    }

    const flight = await this.flights.findById(
      UniqueId.fromString(payload.flightId),
    );
    if (!flight) return;

    flight.syncAvailability(payload.availableSeats > 0);
    const events = flight.pullDomainEvents();
    if (events.length === 0) return;

    await this.flights.save(flight);
    await this.eventBus.publish(events);
  }
}
