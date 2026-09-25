import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { SeatNumber } from '../../domain/model/seat-number';
import { SeatReleaseReason } from '../../domain/model/seat-status';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';
import { SeatMapProvisioner } from '../services/seat-map-provisioner';

export interface ReleaseSeatCommand {
  flightId: string;
  seatNumber: string;
  userDocument?: string;
  reason?: SeatReleaseReason;
}

@Injectable()
export class ReleaseSeatUseCase {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: ReleaseSeatCommand): Promise<{ released: true }> {
    const flightId = UniqueId.fromString(command.flightId);
    const seatNumber = SeatNumber.create(command.seatNumber);

    return this.seatMaps.withLock(flightId, async () => {
      const seatMap = await this.provisioner.loadOrCreate(flightId);

      seatMap.releaseSeat(
        seatNumber,
        command.userDocument,
        command.reason ?? SeatReleaseReason.ReleasedByUser,
        this.clock.now(),
      );

      await this.seatMaps.save(seatMap);
      await this.eventBus.publish(seatMap.pullDomainEvents());

      return { released: true as const };
    });
  }
}
