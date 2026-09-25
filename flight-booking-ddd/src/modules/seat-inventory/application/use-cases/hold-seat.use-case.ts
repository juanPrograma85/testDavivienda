import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { SeatNumber } from '../../domain/model/seat-number';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';
import { SeatMapProvisioner } from '../services/seat-map-provisioner';

export interface HoldSeatCommand {
  flightId: string;
  seatNumber: string;
  userName: string;
  userDocument: string;
}

export interface HoldSeatResult {
  flightId: string;
  seatNumber: string;
  holdId: string;
  expiresAt: string;
  expiresInSeconds: number;
}

/**
 * Historia 2: bloquea el asiento temporalmente y emite el evento en tiempo real
 * que notifica a los demás usuarios activos.
 */
@Injectable()
export class HoldSeatUseCase {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {}

  async execute(command: HoldSeatCommand): Promise<HoldSeatResult> {
    const flightId = UniqueId.fromString(command.flightId);
    const seatNumber = SeatNumber.create(command.seatNumber);
    const ttlSeconds = this.config.get<number>('SEAT_HOLD_TTL_SECONDS', 420);

    return this.seatMaps.withLock(flightId, async () => {
      const seatMap = await this.provisioner.loadOrCreate(flightId);
      const now = this.clock.now();

      const hold = seatMap.holdSeat(
        seatNumber,
        command.userName,
        command.userDocument,
        ttlSeconds,
        now,
      );

      await this.seatMaps.save(seatMap);
      await this.eventBus.publish(seatMap.pullDomainEvents());

      return {
        flightId: flightId.value,
        seatNumber: seatNumber.value,
        holdId: hold.holdId,
        expiresAt: hold.expiresAt.toISOString(),
        expiresInSeconds: hold.remainingSeconds(now),
      };
    });
  }
}
