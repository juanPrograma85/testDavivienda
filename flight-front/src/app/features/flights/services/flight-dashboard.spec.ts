import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FlightDashboardService } from './flight-dashboard';

describe('FlightDashboardService', () => {
  let service: FlightDashboardService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FlightDashboardService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should retrieve dashboard metrics for a flight', () => {
    service.getFlightDashboard('MAD264').subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/dashboard/flights/MAD264',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      flightId: 'MAD264',
      generatedAt: '2026-09-25T18:48:55.909Z',
      totalSeats: 180,
      availableSeats: 180,
      heldSeats: 0,
      occupiedSeats: 0,
      blockedSeats: 0,
      occupancyRate: 0,
    });
  });
});