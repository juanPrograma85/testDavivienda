/**
 * Anti-corruption port: seat-inventory only needs to know whether a flight
 * exists and which aircraft it uses. It never depends on the flight aggregate.
 */
export interface FlightDirectoryPort {
  getAircraft(flightId: string): Promise<{ aircraftModel: string } | null>;
}

export const FLIGHT_DIRECTORY = Symbol('FlightDirectoryPort');
