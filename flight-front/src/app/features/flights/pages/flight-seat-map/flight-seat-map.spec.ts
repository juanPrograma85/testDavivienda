import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { FlightSeatMap } from './flight-seat-map';

describe('FlightSeatMap', () => {
  let component: FlightSeatMap;
  let fixture: ComponentFixture<FlightSeatMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightSeatMap],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['flightId', 'THA001']]) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSeatMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
