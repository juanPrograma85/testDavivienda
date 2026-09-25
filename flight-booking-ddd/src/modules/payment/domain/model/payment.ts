import { AggregateRoot } from '@shared/domain/model/aggregate-root';
import { UniqueId } from '@shared/domain/model/unique-id';
import { Money } from '@shared/domain/model/money';
import { BusinessRuleViolationError } from '@shared/domain/errors/domain-error';
import { CardDetails } from './card-details';
import { PaymentStatus } from './payment-status';
import { PaymentSettledEvent } from '../events/payment-settled.event';

export class Payment extends AggregateRoot<UniqueId> {
  private _status = PaymentStatus.Pending;
  private _authorizationCode?: string;
  private _failureReason?: string;

  private constructor(
    id: UniqueId,
    readonly reservationId: string,
    readonly amount: Money,
    readonly card: CardDetails,
    readonly createdAt: Date,
  ) {
    super(id);
  }

  static initiate(props: {
    reservationId: string;
    amount: Money;
    card: CardDetails;
    now: Date;
  }): Payment {
    if (props.amount.amountInCents <= 0) {
      throw new BusinessRuleViolationError('Payment amount must be positive');
    }
    if (props.card.isExpired(props.now)) {
      throw new BusinessRuleViolationError('The card is expired');
    }
    return new Payment(
      UniqueId.generate(),
      props.reservationId,
      props.amount,
      props.card,
      props.now,
    );
  }

  static rehydrate(props: {
    id: UniqueId;
    reservationId: string;
    amount: Money;
    card: CardDetails;
    createdAt: Date;
    status: PaymentStatus;
    authorizationCode?: string;
    failureReason?: string;
  }): Payment {
    const payment = new Payment(
      props.id,
      props.reservationId,
      props.amount,
      props.card,
      props.createdAt,
    );
    payment._status = props.status;
    payment._authorizationCode = props.authorizationCode;
    payment._failureReason = props.failureReason;
    return payment;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get authorizationCode(): string | undefined {
    return this._authorizationCode;
  }

  get failureReason(): string | undefined {
    return this._failureReason;
  }

  isAuthorized(): boolean {
    return this._status === PaymentStatus.Authorized;
  }

  authorize(authorizationCode: string): void {
    this.assertPending();
    this._status = PaymentStatus.Authorized;
    this._authorizationCode = authorizationCode;
    this.recordSettlement();
  }

  decline(reason: string): void {
    this.assertPending();
    this._status = PaymentStatus.Declined;
    this._failureReason = reason;
    this.recordSettlement();
  }

  private assertPending(): void {
    if (this._status !== PaymentStatus.Pending) {
      throw new BusinessRuleViolationError(
        `Payment ${this.id.value} was already settled as ${this._status}`,
      );
    }
  }

  private recordSettlement(): void {
    const { amount, currency } = this.amount.toPrimitives();
    this.record(
      new PaymentSettledEvent(
        this.id.value,
        this.reservationId,
        this._status,
        amount,
        currency,
        this._failureReason,
      ),
    );
  }
}
