import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';

class FakeEventSource {
  static instance: FakeEventSource | undefined;
  onmessage: ((message: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private readonly listeners = new Map<string, EventListener>();

  constructor(readonly url: string) {
    FakeEventSource.instance = this;
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, payload: unknown): void {
    const event = new MessageEvent('message', { data: JSON.stringify(payload) });
    this.listeners.get(type)?.(event);
  }
}

describe('SseService', () => {
  let service: SseService;

  beforeEach(() => {
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    TestBed.configureTestingModule({});
    service = TestBed.inject(SseService);
  });

  it('parses named events and closes the connection when unsubscribed', () => {
    const received: string[] = [];
    const subscription = service
      .connect<{ seatId: string }>('http://localhost:3000/events', ['SeatHeld'])
      .subscribe((event) => received.push(event.payload.seatId));

    FakeEventSource.instance?.emit('SeatHeld', {
      eventId: 'event-1',
      type: 'SeatHeld',
      version: 1,
      occurredAt: '2026-09-25T00:00:00.000Z',
      flightId: 'THA001',
      aggregateId: '2C',
      payload: { seatId: '2C' },
    });

    expect(FakeEventSource.instance?.url).toBe('http://localhost:3000/events');
    expect(received).toEqual(['2C']);
    subscription.unsubscribe();
    expect(FakeEventSource.instance?.closed).toBe(true);
  });
});