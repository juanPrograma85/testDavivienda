import { Injectable } from '@nestjs/common';
import { FlightCatalogService } from '@modules/flight/application/services/flight-catalog.service';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import { FlightDirectoryPort } from '../../domain/ports/flight-directory.port';

/**
 * Anti-corruption layer towards the flight module. Translates its published
 * language into the narrow contract that seat-inventory actually needs.
 */
@Injectable()
export class FlightDirectoryAdapter implements FlightDirectoryPort {
  constructor(private readonly catalog: FlightCatalogService) {}

  async getAircraft(flightId: string): Promise<{ aircraftModel: string } | null> {
    try {
      const summary = await this.catalog.getSummary(flightId);
      return { aircraftModel: summary.aircraftModel };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}
