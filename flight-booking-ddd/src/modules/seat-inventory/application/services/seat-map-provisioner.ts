import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import { CabinLayout } from '../../domain/model/cabin-layout';
import { SeatMap } from '../../domain/model/seat-map';
import {
  FLIGHT_DIRECTORY,
  FlightDirectoryPort,
} from '../../domain/ports/flight-directory.port';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';

/**
 * Lazily materializes the seat map of a flight the first time it is requested,
 * after validating the flight actually exists.
 */
@Injectable()
export class SeatMapProvisioner {
  constructor(
    @Inject(SEAT_MAP_REPOSITORY)
    private readonly seatMaps: SeatMapRepositoryPort,
    @Inject(FLIGHT_DIRECTORY)
    private readonly flightDirectory: FlightDirectoryPort,
  ) {}

  async loadOrCreate(flightId: UniqueId): Promise<SeatMap> {
    const existing = await this.seatMaps.findByFlightId(flightId);
    if (existing) return existing;

    const aircraft = await this.flightDirectory.getAircraft(flightId.value);
    if (!aircraft) {
      throw new NotFoundError(`Flight ${flightId.value} was not found`);
    }

    const seatMap = SeatMap.forFlight(flightId, CabinLayout.standardNarrowBody());
    await this.seatMaps.save(seatMap);
    return seatMap;
  }
}
