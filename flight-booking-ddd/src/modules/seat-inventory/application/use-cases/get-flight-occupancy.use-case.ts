import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { OccupancySnapshot } from '../../domain/events/occupancy-changed.event';
import { SeatMapProvisioner } from '../services/seat-map-provisioner';

export interface FlightOccupancyView extends OccupancySnapshot {
  flightId: string;
  generatedAt: string;
}

/** Historia 4: métricas de ocupación para el dashboard. */
@Injectable()
export class GetFlightOccupancyUseCase {
  constructor(
    private readonly provisioner: SeatMapProvisioner,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(flightId: string): Promise<FlightOccupancyView> {
    const id = UniqueId.fromString(flightId);
    const seatMap = await this.provisioner.loadOrCreate(id);
    const now = this.clock.now();

    return {
      flightId: id.value,
      generatedAt: now.toISOString(),
      ...seatMap.occupancy(now),
    };
  }
}
