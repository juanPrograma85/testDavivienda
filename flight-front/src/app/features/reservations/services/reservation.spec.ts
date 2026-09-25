import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReservationService } from './reservation';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReservationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should process a payment using the backend contract', () => {
    let paymentStatus: string | undefined;
    service
      .processPayment({
        reservationId: 'b2f5c434-e8e4-4f72-8738-4749b27cd68c',
        amount: 42050,
        card: {
          pan: '4111111111111111',
          cvv: '123',
          expiryMonth: 12,
          expiryYear: 2030,
          holderName: 'Maria Perez',
        },
      })
      .subscribe((payment) => paymentStatus = payment.status);

    const request = httpTestingController.expectOne('/api/v1/payments');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      reservationId: 'b2f5c434-e8e4-4f72-8738-4749b27cd68c',
      amount: 42050,
      card: {
        pan: '4111111111111111',
        cvv: '123',
        expiryMonth: 12,
        expiryYear: 2030,
        holderName: 'Maria Perez',
      },
    });
    request.flush({ paymentId: 'payment-1', status: 'AUTHORIZED', authorizationCode: 'ABC123', failureReason: null });
    expect(paymentStatus).toBe('AUTHORIZED');
  });
});