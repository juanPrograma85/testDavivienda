import { DomainEvent } from '@shared/domain/events/domain-event';
import { PaymentStatus } from '../model/payment-status';

export class PaymentSettledEvent extends DomainEvent {
  static readonly NAME = 'payment.settled';

  constructor(
    paymentId: string,
    readonly reservationId: string,
    readonly status: PaymentStatus,
    readonly amount: number,
    readonly currency: string,
    readonly failureReason?: string,
  ) {
    super(paymentId);
  }

  get eventName(): string {
    return PaymentSettledEvent.NAME;
  }

  toPrimitives(): Record<string, unknown> {
    return {
      paymentId: this.aggregateId,
      reservationId: this.reservationId,
      status: this.status,
      amount: this.amount,
      currency: this.currency,
      failureReason: this.failureReason ?? null,
    };
  }
}
