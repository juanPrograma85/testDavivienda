import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { FareDto } from '../../../flights/models/flight.dto';
import { ReservationService } from '../../services/reservation';

interface ReservationState {
  holdId: string;
  flightId: string;
  seatId: string;
  userName: string;
  userDocument: string;
  fare?: FareDto;
}

@Component({
  selector: 'app-reservation',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './reservation.html',
  styleUrl: './reservation.scss',
})
export class Reservation {
  private readonly formBuilder = inject(FormBuilder);
  private readonly reservationService = inject(ReservationService);

  readonly reservation = (history.state ?? {}) as Partial<ReservationState>;
  readonly paymentCompleted = signal(false);
  readonly paymentRejected = signal(false);
  readonly paymentForm = this.formBuilder.nonNullable.group({
    pan: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    expiryMonth: ['', [Validators.required, Validators.pattern(/^(0?[1-9]|1[0-2])$/)]],
    expiryYear: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    holderName: ['', Validators.required],
  });

  get hasReservation(): boolean {
    return Boolean(this.reservation.holdId && this.reservation.flightId && this.reservation.seatId);
  }

  processPayment(): void {
    if (this.paymentForm.invalid || !this.reservation.holdId) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const card = this.paymentForm.getRawValue();
    this.paymentRejected.set(false);
    this.reservationService
      .processPayment({
        reservationId: this.reservation.holdId,
        amount: Math.round((this.reservation.fare?.amount ?? 0) * 100),
        card: {
          pan: card.pan,
          cvv: card.cvv,
          expiryMonth: Number(card.expiryMonth),
          expiryYear: Number(card.expiryYear),
          holderName: card.holderName,
        },
      })
      .subscribe({
        next: (payment) => {
          this.paymentCompleted.set(payment.status === 'AUTHORIZED');
          this.paymentRejected.set(payment.status !== 'AUTHORIZED');
        },
        error: () => this.paymentRejected.set(true),
      });
  }
}