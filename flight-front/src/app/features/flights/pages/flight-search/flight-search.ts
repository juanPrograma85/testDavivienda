import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { FlightDto } from '../../models/flight.dto';
import { FlightService } from '../../services/flight';
import { FlightDashboardDto } from '../../models/flight-dashboard.dto';
import { FlightDashboardService } from '../../services/flight-dashboard';

@Component({
  selector: 'app-flight-search',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './flight-search.html',
  styleUrl: './flight-search.scss',
})
export class FlightSearch {
  private readonly formBuilder = inject(FormBuilder);
  private readonly flightService = inject(FlightService);
  private readonly flightDashboardService = inject(FlightDashboardService);

  readonly flights = signal<FlightDto[]>([]);
  readonly dashboard = signal<FlightDashboardDto | null>(null);
  readonly isLoadingDashboard = signal(false);
  readonly searchForm = this.formBuilder.group({
    origin: this.formBuilder.nonNullable.control(''),
    destination: this.formBuilder.nonNullable.control(''),
    departureDate: this.formBuilder.control<Date | null>(null),
  });

  searchFlights(): void {
    const { origin, destination, departureDate } = this.searchForm.getRawValue();

    if (!origin || !destination || !departureDate) {
      return;
    }

    const originCode = this.toThreeLetterCode(origin);
    const destinationCode = this.toThreeLetterCode(destination);

    this.flightService
      .search({
        origin: originCode,
        destination: destinationCode,
        departureDate: departureDate.toISOString().slice(0, 10),
      })
      .subscribe((response) => this.flights.set(response.items));
  }

  viewDashboard(flightId: string): void {
    this.isLoadingDashboard.set(true);
    this.flightDashboardService.getFlightDashboard(flightId).subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.isLoadingDashboard.set(false);
      },
      error: () => {
        this.dashboard.set(null);
        this.isLoadingDashboard.set(false);
      },
    });
  }

  private toThreeLetterCode(value: string): string {
    const code = value.trim().slice(0, 3).toLowerCase();

    return `${code.charAt(0).toUpperCase()}${code.slice(1)}`;
  }
}