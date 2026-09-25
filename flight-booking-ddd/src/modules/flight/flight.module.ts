import { Module } from '@nestjs/common';
import { FLIGHT_REPOSITORY } from './domain/ports/flight.repository';
import { PostgresFlightRepository } from './infrastructure/persistence/postgres-flight.repository';
import { SearchFlightsUseCase } from './application/use-cases/search-flights.use-case';
import { GetFlightUseCase } from './application/use-cases/get-flight.use-case';
import { ChangeFlightStatusUseCase } from './application/use-cases/change-flight-status.use-case';
import { FlightCatalogService } from './application/services/flight-catalog.service';
import { FlightAvailabilitySubscriber } from './application/event-handlers/flight-availability.subscriber';
import { FlightController } from './presentation/http/flight.controller';
import { FlightEventsController } from './presentation/http/flight-events.controller';

@Module({
  // The SSE controller is registered first so "/flights/stream" is not captured
  // by the "/flights/:flightId" route.
  controllers: [FlightEventsController, FlightController],
  providers: [
    { provide: FLIGHT_REPOSITORY, useClass: PostgresFlightRepository },
    SearchFlightsUseCase,
    GetFlightUseCase,
    ChangeFlightStatusUseCase,
    FlightCatalogService,
    FlightAvailabilitySubscriber,
  ],
  exports: [FlightCatalogService],
})
export class FlightModule {}
