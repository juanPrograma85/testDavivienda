import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { DomainEvent } from '@shared/domain/events/domain-event';
import {
  DomainEventHandler,
  EventBusPort,
} from '@shared/application/ports/event-bus.port';

/**
 * In-process event bus for the modular monolith. Handlers are isolated: a failing
 * subscriber never breaks the publisher's transaction flow.
 */
@Injectable()
export class InMemoryEventBus implements EventBusPort {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers = new Map<string, DomainEventHandler[]>();
  private readonly stream$ = new Subject<DomainEvent>();

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.stream$.next(event);
      const handlers = this.handlers.get(event.eventName) ?? [];
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler(event);
          } catch (error) {
            this.logger.error(
              `Handler for "${event.eventName}" failed`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        }),
      );
    }
  }

  subscribe(eventName: string, handler: DomainEventHandler): void {
    const current = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...current, handler]);
  }

  /** Raw stream used by realtime adapters that need every event. */
  events() {
    return this.stream$.asObservable();
  }
}
