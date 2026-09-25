import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '@shared/domain/model/unique-id';
import { NotFoundError } from '@shared/domain/errors/domain-error';
import {
  PAYMENT_REPOSITORY,
  PaymentRepositoryPort,
} from '../../domain/ports/payment.repository';
import {
  PaymentResult,
  ProcessPaymentCommand,
  ProcessPaymentUseCase,
} from '../use-cases/process-payment.use-case';

/** Published language of the payment module. */
@Injectable()
export class PaymentService {
  constructor(
    private readonly processPayment: ProcessPaymentUseCase,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  charge(command: ProcessPaymentCommand): Promise<PaymentResult> {
    return this.processPayment.execute(command);
  }

  async getById(paymentId: string): Promise<PaymentResult> {
    const payment = await this.payments.findById(
      UniqueId.fromString(paymentId),
    );
    if (!payment) {
      throw new NotFoundError(`Payment ${paymentId} was not found`);
    }
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
