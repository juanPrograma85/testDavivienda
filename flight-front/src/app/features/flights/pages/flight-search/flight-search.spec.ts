import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FlightSearch } from './flight-search';

describe('FlightSearch', () => {
  let component: FlightSearch;
  let fixture: ComponentFixture<FlightSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightSearch],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows paid seats as occupied and held seats separately', () => {
    component.viewDashboard('THA001');
    TestBed.inject(HttpTestingController).expectOne('/api/v1/dashboard/flights/THA001').flush({
      flightId: 'THA001', generatedAt: '2026-09-25T00:00:00Z', totalSeats: 10,
      availableSeats: 7, heldSeats: 1, occupiedSeats: 2, blockedSeats: 0, occupancyRate: 0.2,
    });
    fixture.detectChanges();

    const dashboard = fixture.nativeElement.querySelector('.dashboard-section') as HTMLElement;
    expect(dashboard.querySelector('.dashboard-header strong')?.textContent).toContain('20% ocupado');
    expect(dashboard.querySelector('.held strong')?.textContent).toContain('1');
    expect(dashboard.querySelector('.occupied strong')?.textContent).toContain('2');
    expect((dashboard.querySelector('.occupancy-track span') as HTMLElement).style.width).toBe('20%');
  });
});
