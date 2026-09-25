import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ProcessPaymentRequest {
  reservationId: string;
  amount: number;
  card: {
    pan: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  };
}

export interface ProcessPaymentResponse {
  paymentId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'DECLINED' | 'REFUNDED';
  authorizationCode: string | null;
  failureReason: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/payments';

  processPayment(request: ProcessPaymentRequest): Observable<ProcessPaymentResponse> {
    return this.http.post<ProcessPaymentResponse>(this.apiUrl, request);
  }
}
