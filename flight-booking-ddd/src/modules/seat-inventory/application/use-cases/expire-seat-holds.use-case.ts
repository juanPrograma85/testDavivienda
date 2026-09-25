import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';

/**
 * Historia 4: la liberación por tiempo expirado debe reflejarse al instante, así
 * que el barrido publica eventos aunque nadie esté consultando el mapa.
 */
@Injectable()
export class ExpireSeatHoldsUseCase {
  private readonly logger = new Logger(ExpireSeatHoldsUseCase.name);

  constructor(
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<{ releasedSeats: number }> {
    const seatMaps = await this.seatMaps.findAll();
    let releasedSeats = 0;

    for (const seatMap of seatMaps) {
      await this.seatMaps.withLock(seatMap.id, async () => {
        const expired = seatMap.expireHolds(this.clock.now());
        if (expired === 0) return;

        releasedSeats += expired;
        await this.seatMaps.save(seatMap);
        await this.eventBus.publish(seatMap.pullDomainEvents());
      });
    }

    if (releasedSeats > 0) {
      this.logger.log(`Released ${releasedSeats} expired seat holds`);
    }
    return { releasedSeats };
  }
}
