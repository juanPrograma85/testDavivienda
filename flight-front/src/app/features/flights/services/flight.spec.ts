import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FlightService } from './flight';

describe('FlightService', () => {
  let service: FlightService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FlightService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search flights using the configured backend endpoint', () => {
    service
      .search({ origin: 'Bog', destination: 'Mex', departureDate: '2026-09-25' })
      .subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/flights?origin=Bog&departureDate=2026-09-25&destination=Mex',
    );

    expect(request.request.method).toBe('GET');
    request.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });
});
