import { randomUUID } from 'node:crypto';
import { InvalidArgumentError } from '../errors/domain-error';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FLIGHT_ID = /^[A-Z]{2,3}\d{3}$/;

/** Identity value object shared by every aggregate. */
export class UniqueId {
  private constructor(readonly value: string) {}

  static generate(): UniqueId {
    return new UniqueId(randomUUID());
  }

  static fromString(value: string): UniqueId {
    const normalized = value?.trim().toUpperCase() ?? '';
    if (!UUID_V4.test(normalized) && !FLIGHT_ID.test(normalized)) {
      throw new InvalidArgumentError(`"${value}" is not a valid identifier`);
    }
    return new UniqueId(normalized);
  }

  equals(other: UniqueId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
