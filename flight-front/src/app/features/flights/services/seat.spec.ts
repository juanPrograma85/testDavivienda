import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SeatService } from './seat';

describe('SeatService', () => {
  let service: SeatService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeatService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve seats for the selected flight', () => {
    service.getAvailableSeats('CMP312').subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/flights/CMP312/seats',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      flightId: 'CMP312',
      occupancy: { availableSeats: 1, heldSeats: 0, occupiedSeats: 0 },
      seats: [{ number: '2C', row: 2, column: 'C', cabinClass: 'ECONOMY', status: 'AVAILABLE' }],
    });
  });

  it('should place a hold on the selected seat', () => {
    service.holdSeat('CMP312', '2C', 'Maria Perez', '1030630683').subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/flights/CMP312/seats/2C/hold',
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      userName: 'Maria Perez',
      userDocument: '1030630683',
    });
    request.flush({
      holdId: 'hold-123',
      flightId: 'CMP312',
      seatId: '2C',
      expiresAt: '2026-09-25T16:00:00.000Z',
      expiresInSeconds: 420,
    });
  });
});
