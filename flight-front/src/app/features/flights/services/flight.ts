import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FlightDto, FlightSearchResponse, SearchFlightsRequest } from '../models/flight.dto';

@Injectable({
  providedIn: 'root',
})
export class FlightService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/flights';

  search(request: SearchFlightsRequest): Observable<FlightSearchResponse> {
    const params = new HttpParams()
      .set('origin', request.origin)
      .set('departureDate', request.departureDate)
      .set('destination', request.destination);

    return this.http.get<FlightSearchResponse>(this.apiUrl, { params });
  }

  getFlightById(id: string): Observable<FlightDto> {
    return this.http.get<FlightDto>(`${this.apiUrl}/${id}`);
  }
}
