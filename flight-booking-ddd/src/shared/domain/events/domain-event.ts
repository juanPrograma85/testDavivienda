import { randomUUID } from 'node:crypto';

/**
 * Base class for domain events. Immutable facts that already happened.
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly version = 1;
  readonly occurredAt: Date;

  protected constructor(
    readonly aggregateId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.occurredAt = occurredAt ?? new Date();
  }

  /** Stable, transport-agnostic event name used for routing and SSE topics. */
  abstract get eventName(): string;

  /** Serializable payload exposed to outbound adapters (SSE, brokers, logs). */
  abstract toPrimitives(): Record<string, unknown>;
}
