import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AuthorizationRequest,
  AuthorizationResult,
  PaymentGatewayPort,
} from '../../domain/ports/payment-gateway.port';

@Injectable()
export class FakePaymentGateway implements PaymentGatewayPort {
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    if (request.card.last4 === '0000') {
      return Promise.resolve({
        approved: false,
        declineReason: 'Payment declined by the fake gateway',
      });
    }

    return Promise.resolve({
      approved: true,
      authorizationCode: `FAKE-${randomUUID()}`,
    });
  }
}