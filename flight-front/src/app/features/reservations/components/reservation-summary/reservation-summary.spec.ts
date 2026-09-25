import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationSummary } from './reservation-summary';

describe('ReservationSummary', () => {
  let component: ReservationSummary;
  let fixture: ComponentFixture<ReservationSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationSummary],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
