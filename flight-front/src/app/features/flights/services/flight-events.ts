import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, timer } from 'rxjs';
import { SseService } from '../../../core/services/sse.service';
import { FLIGHT_EVENT_TYPES, FlightRealtimeEvent } from '../models/flight-event.model';

@Injectable({ providedIn: 'root' })
export class FlightEventsService {
  private readonly sse = inject(SseService);
  private readonly apiUrl = '/api/v1/flights';

  connect(flightId: string, onReconnect: () => void): Observable<FlightRealtimeEvent> {
    return this.sse
      .connect<FlightRealtimeEvent['payload']>(`${this.apiUrl}/${flightId}/events`, FLIGHT_EVENT_TYPES)
      .pipe(
        retry({
          delay: () => {
            onReconnect();
            return timer(1_000);
          },
        }),
        map((event) => event as FlightRealtimeEvent),
      );
  }
}