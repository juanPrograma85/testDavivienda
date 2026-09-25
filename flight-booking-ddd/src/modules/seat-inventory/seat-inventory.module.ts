import { Module } from '@nestjs/common';
import { FlightModule } from '@modules/flight/flight.module';
import { SEAT_MAP_REPOSITORY } from './domain/ports/seat-map.repository';
import { FLIGHT_DIRECTORY } from './domain/ports/flight-directory.port';
import { PostgresSeatMapRepository } from './infrastructure/persistence/postgres-seat-map.repository';
import { FlightDirectoryAdapter } from './infrastructure/acl/flight-directory.adapter';
import { SeatHoldExpirationScheduler } from './infrastructure/scheduling/seat-hold-expiration.scheduler';
import { SeatMapProvisioner } from './application/services/seat-map-provisioner';
import { SeatInventoryService } from './application/services/seat-inventory.service';
import { GetSeatMapUseCase } from './application/use-cases/get-seat-map.use-case';
import { HoldSeatUseCase } from './application/use-cases/hold-seat.use-case';
import { ReleaseSeatUseCase } from './application/use-cases/release-seat.use-case';
import { OccupySeatUseCase } from './application/use-cases/occupy-seat.use-case';
import { ExpireSeatHoldsUseCase } from './application/use-cases/expire-seat-holds.use-case';
import { GetFlightOccupancyUseCase } from './application/use-cases/get-flight-occupancy.use-case';
import { PaymentSettledSubscriber } from './application/event-handlers/payment-settled.subscriber';
import { SeatController } from './presentation/http/seat.controller';
import { SeatEventsController } from './presentation/http/seat-events.controller';
import { DashboardController } from './presentation/http/dashboard.controller';

@Module({
  imports: [FlightModule],
  controllers: [SeatEventsController, SeatController, DashboardController],
  providers: [
    { provide: SEAT_MAP_REPOSITORY, useClass: PostgresSeatMapRepository },
    { provide: FLIGHT_DIRECTORY, useClass: FlightDirectoryAdapter },
    SeatMapProvisioner,
    SeatInventoryService,
    GetSeatMapUseCase,
    HoldSeatUseCase,
    ReleaseSeatUseCase,
    OccupySeatUseCase,
    ExpireSeatHoldsUseCase,
    GetFlightOccupancyUseCase,
    PaymentSettledSubscriber,
    SeatHoldExpirationScheduler,
  ],
  exports: [SeatInventoryService],
})
export class SeatInventoryModule {}
