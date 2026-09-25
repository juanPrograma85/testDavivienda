/**
 * Domain-level errors. Infrastructure/presentation translates them into transport codes,
 * so the domain never depends on HTTP.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The request is structurally or semantically invalid. */
export class InvalidArgumentError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** The aggregate does not exist. */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** The operation conflicts with the current state of the aggregate. */
export class BusinessRuleViolationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
