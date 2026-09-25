import { InvalidArgumentError } from '../errors/domain-error';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'COP', 'MXN'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Money is stored in minor units (cents) to avoid floating point rounding drift.
 */
export class Money {
  private constructor(
    readonly amountInCents: number,
    readonly currency: Currency,
  ) {}

  static fromCents(amountInCents: number, currency: string): Money {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new InvalidArgumentError(
        'Monetary amount must be a non-negative integer of minor units',
      );
    }
    const normalized = currency?.toUpperCase() as Currency;
    if (!SUPPORTED_CURRENCIES.includes(normalized)) {
      throw new InvalidArgumentError(`Unsupported currency "${currency}"`);
    }
    return new Money(amountInCents, normalized);
  }

  static fromUnits(amount: number, currency: string): Money {
    return Money.fromCents(Math.round(amount * 100), currency);
  }

  get amount(): number {
    return this.amountInCents / 100;
  }

  equals(other: Money): boolean {
    return (
      this.amountInCents === other.amountInCents &&
      this.currency === other.currency
    );
  }

  toPrimitives(): { amount: number; currency: Currency } {
    return { amount: this.amount, currency: this.currency };
  }
}
