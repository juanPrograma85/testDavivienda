import { InvalidArgumentError } from '@shared/domain/errors/domain-error';

const DIGITS_ONLY = /^\d+$/;

/**
 * Card data value object.
 *
 * SECURITY: the PAN and the CVV are validated and then discarded. Only the
 * brand, the last four digits and the expiry are kept in memory, so no
 * cardholder data can leak through logs, events or persistence (PCI-DSS 3.4).
 */
export class CardDetails {
  private constructor(
    readonly brand: string,
    readonly last4: string,
    readonly expiryMonth: number,
    readonly expiryYear: number,
    readonly holderName: string,
  ) {}

  static create(input: {
    pan: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  }): CardDetails {
    const pan = input.pan?.replace(/[\s-]/g, '') ?? '';

    if (!DIGITS_ONLY.test(pan) || pan.length < 13 || pan.length > 19) {
      throw new InvalidArgumentError('Card number has an invalid length');
    }
    if (!CardDetails.passesLuhn(pan)) {
      throw new InvalidArgumentError('Card number failed the checksum validation');
    }
    if (!DIGITS_ONLY.test(input.cvv ?? '') || ![3, 4].includes(input.cvv.length)) {
      throw new InvalidArgumentError('Security code must be 3 or 4 digits');
    }
    if (input.expiryMonth < 1 || input.expiryMonth > 12) {
      throw new InvalidArgumentError('Expiry month must be between 1 and 12');
    }
    if (!input.holderName?.trim()) {
      throw new InvalidArgumentError('Cardholder name is required');
    }

    return new CardDetails(
      CardDetails.detectBrand(pan),
      pan.slice(-4),
      input.expiryMonth,
      input.expiryYear,
      input.holderName.trim(),
    );
  }

  static rehydrate(input: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
  }): CardDetails {
    return new CardDetails(
      input.brand,
      input.last4,
      input.expiryMonth,
      input.expiryYear,
      input.holderName,
    );
  }

  isExpired(now: Date): boolean {
    const endOfMonth = new Date(
      Date.UTC(this.expiryYear, this.expiryMonth, 1) - 1,
    );
    return endOfMonth.getTime() < now.getTime();
  }

  get masked(): string {
    return `**** **** **** ${this.last4}`;
  }

  private static detectBrand(pan: string): string {
    if (/^4/.test(pan)) return 'VISA';
    if (/^5[1-5]/.test(pan) || /^2[2-7]/.test(pan)) return 'MASTERCARD';
    if (/^3[47]/.test(pan)) return 'AMEX';
    if (/^(6011|65)/.test(pan)) return 'DISCOVER';
    return 'UNKNOWN';
  }

  private static passesLuhn(pan: string): boolean {
    let sum = 0;
    let double = false;
    for (let i = pan.length - 1; i >= 0; i--) {
      let digit = pan.charCodeAt(i) - 48;
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    return sum % 10 === 0;
  }
}
