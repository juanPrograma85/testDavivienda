import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HoldSeatResponse, SeatDto, SeatMapResponse } from '../models/seat.dto';

type BackendSeatDto = Omit<SeatDto, 'seatId' | 'holdId' | 'holdExpiresAt'> & {
  seatId?: string;
  number?: string;
  holdId?: string | null;
  holdExpiresAt?: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class SeatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/flights';

  getAvailableSeats(flightId: string): Observable<SeatMapResponse> {
    return this.http.get<Omit<SeatMapResponse, 'seats'> & { seats: BackendSeatDto[] }>(`${this.apiUrl}/${flightId}/seats`).pipe(
      map((response) => ({
        ...response,
        seats: response.seats.map((seat) => ({
          ...seat,
          seatId: seat.seatId ?? seat.number ?? '',
          holdId: seat.holdId ?? null,
          holdExpiresAt: seat.holdExpiresAt ?? null,
        })),
      })),
    );
  }

  holdSeat(
    flightId: string,
    seatId: string,
    userName: string,
    userDocument: string,
  ): Observable<HoldSeatResponse> {
    return this.http.post<HoldSeatResponse>(`${this.apiUrl}/${flightId}/seats/${seatId}/hold`, {
      userName,
      userDocument,
    });
  }
}
