import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';
import { SeatMapProvisioner } from '../services/seat-map-provisioner';
import { SeatMapMapper, SeatMapView } from '../mappers/seat-map.mapper';

/** Historia 2: mapa interactivo de la aeronave. */
@Injectable()
export class GetSeatMapUseCase {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(flightId: string): Promise<SeatMapView> {
    const id = UniqueId.fromString(flightId);

    return this.seatMaps.withLock(id, async () => {
      const seatMap = await this.provisioner.loadOrCreate(id);
      const now = this.clock.now();

      // Reading the map is also a good moment to reap stale locks.
      if (seatMap.expireHolds(now) > 0) {
        await this.seatMaps.save(seatMap);
        await this.eventBus.publish(seatMap.pullDomainEvents());
      }

      return SeatMapMapper.toView(seatMap, now);
    });
  }
}
