import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Reservation } from './reservation';

describe('Reservation', () => {
  let component: Reservation;
  let fixture: ComponentFixture<Reservation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reservation],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Reservation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows success only for an authorized payment', () => {
    Object.assign(component.reservation, { holdId: 'hold-1', flightId: 'THA001', seatId: '2A' });
    component.paymentForm.setValue({
      pan: '4111111111111111', cvv: '123', expiryMonth: '12', expiryYear: '2030', holderName: 'Maria Perez',
    });
    component.processPayment();

    TestBed.inject(HttpTestingController).expectOne('/api/v1/payments').flush({
      paymentId: 'payment-1', status: 'AUTHORIZED', authorizationCode: 'ABC123', failureReason: null,
    });

    expect(component.paymentCompleted()).toBe(true);
    expect(component.paymentRejected()).toBe(false);
  });

  it('does not show success when the payment is declined', () => {
    Object.assign(component.reservation, { holdId: 'hold-2', flightId: 'THA001', seatId: '2A' });
    component.paymentForm.setValue({
      pan: '4111111111111111', cvv: '123', expiryMonth: '12', expiryYear: '2030', holderName: 'Maria Perez',
    });
    component.processPayment();

    TestBed.inject(HttpTestingController).expectOne('/api/v1/payments').flush({
      paymentId: 'payment-2', status: 'DECLINED', authorizationCode: null, failureReason: 'Declined',
    });

    expect(component.paymentCompleted()).toBe(false);
    expect(component.paymentRejected()).toBe(true);
  });
});
