import { UniqueId } from '@shared/domain/model/unique-id';
import { Flight } from '../model/flight';
import { AirportCode } from '../model/airport-code';
import { FlightStatus } from '../model/flight-status';

export interface FlightSearchCriteria {
  origin?: AirportCode;
  destination?: AirportCode;
  /** Local calendar day of departure (UTC based). */
  departureDate?: Date;
  statuses?: FlightStatus[];
  maxFare?: number;
  sortBy?: 'departure' | 'price';
  limit: number;
  offset: number;
}

export interface FlightSearchResult {
  items: Flight[];
  total: number;
}

export interface FlightRepositoryPort {
  findById(id: UniqueId): Promise<Flight | null>;
  search(criteria: FlightSearchCriteria): Promise<FlightSearchResult>;
  save(flight: Flight): Promise<void>;
}

export const FLIGHT_REPOSITORY = Symbol('FlightRepositoryPort');
