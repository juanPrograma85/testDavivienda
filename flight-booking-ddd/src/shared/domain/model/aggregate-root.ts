import { DomainEvent } from '../events/domain-event';

export abstract class Entity<TId> {
  protected constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  equals(other?: Entity<TId>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return String(this._id) === String(other._id);
  }
}

/**
 * Consistency boundary. Only aggregate roots are loaded and persisted by repositories.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this._events.push(event);
  }

  /** Drains recorded events so the application layer controls publication timing. */
  pullDomainEvents(): DomainEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}
