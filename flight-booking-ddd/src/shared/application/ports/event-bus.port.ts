import { DomainEvent } from '@shared/domain/events/domain-event';
import { Observable } from 'rxjs';

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * Outbound port for in-process domain event propagation between modules.
 * Swapping the in-memory adapter for a broker (Kafka/Rabbit) requires no domain change.
 */
export interface EventBusPort {
  publish(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: DomainEventHandler): void;
  events(): Observable<DomainEvent>;
}

export const EVENT_BUS = Symbol('EventBusPort');
