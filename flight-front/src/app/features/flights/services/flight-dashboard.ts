import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FlightDashboardDto } from '../models/flight-dashboard.dto';

@Injectable({ providedIn: 'root' })
export class FlightDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/dashboard/flights';

  getFlightDashboard(flightId: string): Observable<FlightDashboardDto> {
    return this.http.get<FlightDashboardDto>(`${this.apiUrl}/${flightId}`);
  }
}