import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, filter, map, merge, timer } from 'rxjs';
import { DomainEvent } from '@shared/domain/events/domain-event';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { Inject } from '@nestjs/common';
import { SseEventEnvelope } from '@shared/application/realtime/sse-event.dto';

const HEARTBEAT_INTERVAL_MS = 25_000;

export type DomainEventPredicate = (event: DomainEvent) => boolean;

/**
 * Driven adapter that turns domain events into Server-Sent Events.
 * Presentation controllers depend on this hub only, never on the transport details.
 */
@Injectable()
export class RealtimeHub {
  constructor(@Inject(EVENT_BUS) private readonly eventBus: EventBusPort) {}

  /**
   * Builds an SSE stream. A periodic comment-like heartbeat prevents idle
   * connections from being dropped by proxies and load balancers.
   */
  stream(predicate: DomainEventPredicate): Observable<MessageEvent> {
    const events$ = this.eventBus.events().pipe(
      filter(predicate),
      map<DomainEvent, MessageEvent>((event) => {
        const payload = event.toPrimitives();
        const envelope: SseEventEnvelope = {
          eventId: event.eventId,
          type: this.publicType(event.eventName),
          version: event.version,
          occurredAt: event.occurredAt.toISOString(),
          flightId: String(payload.flightId ?? event.aggregateId),
          aggregateId: String(payload.seatNumber ?? event.aggregateId),
          payload: this.toSsePayload(payload),
        };

        return {
          id: envelope.eventId,
          type: envelope.type,
          data: envelope,
        };
      }),
    );

    const heartbeat$ = timer(HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS).pipe(
      map<number, MessageEvent>(() => ({
        type: 'heartbeat',
        data: { ts: new Date().toISOString() },
      })),
    );

    return merge(events$, heartbeat$);
  }

  private publicType(eventName: string): string {
    return eventName
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private toSsePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const ssePayload = { ...payload };
    const seatNumber = ssePayload.seatNumber;
    delete ssePayload.flightId;
    delete ssePayload.seatNumber;
    return { ...ssePayload, ...(seatNumber ? { seatId: seatNumber } : {}) };
  }
}
