import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { PAYMENT_REPOSITORY } from './domain/ports/payment.repository';
import { PostgresPaymentRepository } from './infrastructure/persistence/postgres-payment.repository';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { PaymentService } from './application/services/payment.service';
import { PAYMENT_GATEWAY } from './domain/ports/payment-gateway.port';
import { FakePaymentGateway } from './infrastructure/gateway/fake-payment.gateway';
import { PaymentController } from './presentation/http/payment.controller';

@Module({
  imports: [SharedModule],
  controllers: [PaymentController],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: PostgresPaymentRepository },
    { provide: PAYMENT_GATEWAY, useClass: FakePaymentGateway },
    ProcessPaymentUseCase,
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}