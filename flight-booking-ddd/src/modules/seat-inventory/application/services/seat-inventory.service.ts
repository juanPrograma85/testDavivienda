import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { SeatNumber } from '../../domain/model/seat-number';
import {
  CABIN_FARE_MULTIPLIER,
  CabinClass,
  SeatReleaseReason,
  SeatStatus,
} from '../../domain/model/seat-status';
import { SeatMapProvisioner } from './seat-map-provisioner';
import { OccupySeatUseCase } from '../use-cases/occupy-seat.use-case';
import { ReleaseSeatUseCase } from '../use-cases/release-seat.use-case';

export interface SeatDescription {
  flightId: string;
  seatNumber: string;
  cabinClass: CabinClass;
  status: SeatStatus;
  fareMultiplier: number;
  holdId: string | null;
}

/**
 * Published language of the seat-inventory module. Other modules consume only
 * these operations through their own anti-corruption adapters.
 */
@Injectable()
export class SeatInventoryService {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    private readonly occupySeat: OccupySeatUseCase,
    private readonly releaseSeat: ReleaseSeatUseCase,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async describeSeat(
    flightId: string,
    seatNumber: string,
  ): Promise<SeatDescription> {
    const seatMap = await this.provisioner.loadOrCreate(
      UniqueId.fromString(flightId),
    );
    const number = SeatNumber.create(seatNumber);
    const seat = seatMap.seatOrFail(number);
    const now = this.clock.now();

    return {
      flightId,
      seatNumber: number.value,
      cabinClass: seat.cabinClass,
      status: seat.effectiveStatus(now),
      fareMultiplier: CABIN_FARE_MULTIPLIER[seat.cabinClass],
      holdId: seat.hold?.holdId ?? null,
    };
  }

  confirmSeat(input: {
    flightId: string;
    seatNumber: string;
    holdId: string;
    reservationId: string;
  }): Promise<void> {
    return this.occupySeat.execute(input);
  }

  async freeSeat(input: {
    flightId: string;
    seatNumber: string;
    reason: SeatReleaseReason;
  }): Promise<void> {
    await this.releaseSeat.execute(input);
  }
}
