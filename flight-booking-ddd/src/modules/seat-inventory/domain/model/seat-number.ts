import { InvalidArgumentError } from '@shared/domain/errors/domain-error';

const SEAT_PATTERN = /^(\d{1,2})([A-K])$/;

/** Seat label such as 12A. Row + column letter. */
export class SeatNumber {
  private constructor(
    readonly value: string,
    readonly row: number,
    readonly column: string,
  ) {}

  static create(value: string): SeatNumber {
    const normalized = value?.trim().toUpperCase() ?? '';
    const match = SEAT_PATTERN.exec(normalized);
    if (!match) {
      throw new InvalidArgumentError(`"${value}" is not a valid seat number`);
    }
    const row = Number(match[1]);
    if (row < 1 || row > 99) {
      throw new InvalidArgumentError(`Seat row ${row} is out of range`);
    }
    return new SeatNumber(normalized, row, match[2]);
  }

  equals(other: SeatNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
