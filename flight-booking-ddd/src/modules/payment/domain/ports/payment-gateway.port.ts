import { Money } from '@shared/domain/model/money';
import { CardDetails } from '../model/card-details';

export interface AuthorizationRequest {
  paymentId: string;
  reservationId: string;
  amount: Money;
  card: CardDetails;
}

export type AuthorizationResult =
  | { approved: true; authorizationCode: string }
  | { approved: false; declineReason: string };

/** Outbound port to the PSP. The fake adapter can be swapped for a real one. */
export interface PaymentGatewayPort {
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult>;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGatewayPort');
