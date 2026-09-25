import { Inject, Injectable } from '@nestjs/common';
import { AirportCode } from '../../domain/model/airport-code';
import { FlightStatus } from '../../domain/model/flight-status';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
  FlightSearchCriteria,
} from '../../domain/ports/flight.repository';
import { FlightMapper, FlightView } from '../mappers/flight.mapper';

export interface SearchFlightsQuery {
  origin?: string;
  destination?: string;
  departureDate?: string;
  statuses?: FlightStatus[];
  maxFare?: number;
  sortBy?: 'departure' | 'price';
  page: number;
  pageSize: number;
}

export interface SearchFlightsResponse {
  items: FlightView[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class SearchFlightsUseCase {
  constructor(
    @Inject(FLIGHT_REPOSITORY)
    private readonly flights: FlightRepositoryPort,
  ) {}

  async execute(query: SearchFlightsQuery): Promise<SearchFlightsResponse> {
    const criteria: FlightSearchCriteria = {
      origin: query.origin ? AirportCode.create(query.origin) : undefined,
      destination: query.destination
        ? AirportCode.create(query.destination)
        : undefined,
      departureDate: query.departureDate
        ? new Date(`${query.departureDate}T00:00:00.000Z`)
        : undefined,
      statuses: query.statuses,
      maxFare: query.maxFare,
      sortBy: query.sortBy ?? 'departure',
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    };

    const { items, total } = await this.flights.search(criteria);

    return {
      items: items.map(FlightMapper.toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
