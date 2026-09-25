import { Inject, Injectable } from '@nestjs/common';
import { Money } from '@shared/domain/model/money';
import { CLOCK, ClockPort } from '@shared/application/ports/clock.port';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { CardDetails } from '../../domain/model/card-details';
import { Payment } from '../../domain/model/payment';
import { PaymentStatus } from '../../domain/model/payment-status';
import {
  PAYMENT_GATEWAY,
  PaymentGatewayPort,
} from '../../domain/ports/payment-gateway.port';
import {
  PAYMENT_REPOSITORY,
  PaymentRepositoryPort,
} from '../../domain/ports/payment.repository';

export interface ProcessPaymentCommand {
  reservationId: string;
  amountInCents: number;
  currency: string;
  card: {
    pan: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  };
}

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  authorizationCode: string | null;
  failureReason: string | null;
  maskedCard: string;
  brand: string;
  amount: { amount: number; currency: string };
}

/** Historia 3: procesamiento del pago (datos ficticios) de la reserva. */
@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGatewayPort,
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<PaymentResult> {
    const existing = await this.payments.findByReservationId(
      command.reservationId,
    );
    if (existing) {
      // Idempotency guard: a retried request never charges twice.
      return this.toResult(existing);
    }

    const payment = Payment.initiate({
      reservationId: command.reservationId,
      amount: Money.fromCents(command.amountInCents, command.currency),
      card: CardDetails.create(command.card),
      now: this.clock.now(),
    });

    await this.payments.save(payment);

    const outcome = await this.gateway.authorize({
      paymentId: payment.id.value,
      reservationId: payment.reservationId,
      amount: payment.amount,
      card: payment.card,
    });

    if (outcome.approved) {
      payment.authorize(outcome.authorizationCode);
    } else {
      payment.decline(outcome.declineReason);
    }

    await this.payments.save(payment);
    await this.eventBus.publish(payment.pullDomainEvents());

    return this.toResult(payment);
  }

  private toResult(payment: Payment): PaymentResult {
    return {
      paymentId: payment.id.value,
      status: payment.status,
      authorizationCode: payment.authorizationCode ?? null,
      failureReason: payment.failureReason ?? null,
      maskedCard: payment.card.masked,
      brand: payment.card.brand,
      amount: payment.amount.toPrimitives(),
    };
  }
}
