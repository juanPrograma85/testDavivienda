import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeatDto } from '../../models/seat.dto';
import { FareDto } from '../../models/flight.dto';
import { SeatService } from '../../services/seat';
import { FlightEventsService } from '../../services/flight-events';
import { FlightSeatMapState } from '../../state/flight-seat-map.state';

interface SeatRow {
  row: number;
  leftSeats: Array<SeatDto | null>;
  rightSeats: Array<SeatDto | null>;
}

@Component({
  selector: 'app-flight-seat-map',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  providers: [FlightSeatMapState],
  templateUrl: './flight-seat-map.html',
  styleUrl: './flight-seat-map.scss',
})
export class FlightSeatMap {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seatService = inject(SeatService);
  private readonly flightEvents = inject(FlightEventsService);
  private readonly seatMapState = inject(FlightSeatMapState);

  readonly seats = this.seatMapState.seats;
  readonly selectedSeat = signal<string | null>(null);
  readonly isHoldingSeat = signal(false);
  readonly holdError = signal<string | null>(null);
  readonly showSeatMap = signal(false);
  readonly flightId = this.route.snapshot.paramMap.get('flightId') ?? '';
  readonly fare = (history.state ?? {}).fare as FareDto | undefined;
  readonly passengerForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    document: ['', [Validators.required, Validators.minLength(5)]],
  });
  readonly seatRows = computed<SeatRow[]>(() => {
    const seatsByRow = new Map<number, SeatDto[]>();

    for (const seat of this.seats()) {
      const seats = seatsByRow.get(seat.row) ?? [];
      seats.push(seat);
      seatsByRow.set(seat.row, seats);
    }

    return [...seatsByRow.entries()]
      .sort(([firstRow], [secondRow]) => firstRow - secondRow)
      .map(([row, seats]) => ({
        row,
        leftSeats: this.seatsForColumns(seats, ['A', 'B', 'C']),
        rightSeats: this.seatsForColumns(seats, ['D', 'E', 'F']),
      }));
  });

  continueToSeatSelection(): void {
    if (this.passengerForm.invalid || !this.flightId) {
      this.passengerForm.markAllAsTouched();
      return;
    }

    this.loadSeatSnapshot(true);
  }

  selectSeat(seatId: string): void {
    this.selectedSeat.set(seatId);
    this.holdError.set(null);

    if (!this.flightId || this.isHoldingSeat()) {
      return;
    }

    this.isHoldingSeat.set(true);
    this.seatService
      .holdSeat(
        this.flightId,
        seatId,
        this.passengerForm.controls.fullName.value,
        this.passengerForm.controls.document.value,
      )
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/reservations'], {
            state: {
              holdId: response.holdId,
              flightId: this.flightId,
              seatId,
              userName: this.passengerForm.controls.fullName.value,
              userDocument: this.passengerForm.controls.document.value,
              fare: this.fare,
              expiresAt: response.expiresAt,
            },
          });
        },
        error: () => {
          this.isHoldingSeat.set(false);
          this.holdError.set('El puesto ya no está disponible. Selecciona otro para continuar.');
        },
      });
  }

  private seatsForColumns(seats: SeatDto[], columns: string[]): Array<SeatDto | null> {
    return columns.map((column) => seats.find((seat) => seat.column === column) ?? null);
  }

  private connectToSeatEvents(): void {
    this.flightEvents
      .connect(this.flightId, () => this.loadSeatSnapshot(false))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.seatMapState.applyEvent(event));
  }

  private loadSeatSnapshot(connectToEvents: boolean): void {
    this.seatService.getAvailableSeats(this.flightId).subscribe((response) => {
      this.seatMapState.setSnapshot(response.seats);
      this.showSeatMap.set(true);

      if (connectToEvents) {
        this.connectToSeatEvents();
      }
    });
  }
}