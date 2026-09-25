import { InvalidArgumentError } from '@shared/domain/errors/domain-error';

const IATA_PATTERN = /^[A-Z]{3}$/;

export class AirportCode {
  private constructor(readonly value: string) {}

  static create(value: string): AirportCode {
    const normalized = value?.trim().toUpperCase() ?? '';
    if (!IATA_PATTERN.test(normalized)) {
      throw new InvalidArgumentError(
        `"${value}" is not a valid IATA airport code (3 letters)`,
      );
    }
    return new AirportCode(normalized);
  }

  equals(other: AirportCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
