import { InvalidArgumentError } from '../errors/domain-error';

const SUPPORTED_CURRENCIES = ['COP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static create(amount: number, currency: string = 'COP'): Money {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new InvalidArgumentError(
        'Monetary amount must be a non-negative integer of Colombian pesos',
      );
    }
    const normalized = currency?.toUpperCase() as Currency;
    if (!SUPPORTED_CURRENCIES.includes(normalized)) {
      throw new InvalidArgumentError(`Unsupported currency "${currency}"`);
    }
    return new Money(amount, normalized);
  }

  equals(other: Money): boolean {
    return (
      this.amount === other.amount &&
      this.currency === other.currency
    );
  }

  toPrimitives(): { amount: number; currency: Currency } {
    return { amount: this.amount, currency: this.currency };
  }
}
