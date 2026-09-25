import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { SeatNumber } from '../../domain/model/seat-number';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';
import { SeatMapProvisioner } from '../services/seat-map-provisioner';

export interface OccupySeatCommand {
  flightId: string;
  seatNumber: string;
  holdId: string;
  reservationId: string;
}

/**
 * Historia 3: convierte el bloqueo temporal en ocupación permanente y emite el
 * evento global que deshabilita el asiento para todos los clientes.
 */
@Injectable()
export class OccupySeatUseCase {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: OccupySeatCommand): Promise<void> {
    const flightId = UniqueId.fromString(command.flightId);
    const seatNumber = SeatNumber.create(command.seatNumber);

    await this.seatMaps.withLock(flightId, async () => {
      const seatMap = await this.provisioner.loadOrCreate(flightId);

      seatMap.occupySeat(
        seatNumber,
        command.holdId,
        command.reservationId,
        this.clock.now(),
      );

      await this.seatMaps.save(seatMap);
      await this.eventBus.publish(seatMap.pullDomainEvents());
    });
  }
}
